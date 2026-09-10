"""
Synthro — Hyperliquid Async Market Ingestor

Async client querying Hyperliquid L1 public endpoints via httpx.
Features:
  - Live 1h funding rates & universe metadata
  - L2 order-book snapshot → instantaneous slippage calculator ($10k USDC)
  - 15-second TTL in-memory cache (prevents rate-limiting)
  - High-fidelity stochastic mock fallback for offline/CI use
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Any

import httpx
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# Retry configuration
_MAX_RETRIES: int = 3
_RETRY_STATUS: frozenset[int] = frozenset({429, 500, 502, 503, 504})
_BASE_BACKOFF: float = 1.0  # seconds; doubles each retry

# ── TTL Cache ─────────────────────────────────────────────────────────────────

class _TTLCache:
    """Simple thread-unsafe in-memory cache with per-key TTL."""

    def __init__(self, ttl_seconds: float = 15.0) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry and (time.monotonic() - entry[0]) < self._ttl:
            return entry[1]
        return None

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (time.monotonic(), value)

    def clear(self) -> None:
        self._store.clear()


# ── Asset Universe ────────────────────────────────────────────────────────────

ASSET_CONFIGS: dict[str, dict[str, Any]] = {
    "BTC":  {"sz_decimals": 5, "base_price": 67_500.0, "daily_vol": 0.025,
              "funding_mean_1h": 0.000035, "funding_std_1h": 0.000022, "oi_usd": 1_450_000_000.0},
    "ETH":  {"sz_decimals": 4, "base_price": 3_620.0,  "daily_vol": 0.032,
              "funding_mean_1h": 0.000030, "funding_std_1h": 0.000028, "oi_usd": 820_000_000.0},
    "SOL":  {"sz_decimals": 2, "base_price": 172.0,    "daily_vol": 0.048,
              "funding_mean_1h": 0.000048, "funding_std_1h": 0.000038, "oi_usd": 380_000_000.0},
    "AVAX": {"sz_decimals": 2, "base_price": 33.5,     "daily_vol": 0.055,
              "funding_mean_1h": 0.000040, "funding_std_1h": 0.000042, "oi_usd": 95_000_000.0},
    "ARB":  {"sz_decimals": 1, "base_price": 0.82,     "daily_vol": 0.062,
              "funding_mean_1h": 0.000055, "funding_std_1h": 0.000050, "oi_usd": 68_000_000.0},
    "DOGE": {"sz_decimals": 0, "base_price": 0.125,    "daily_vol": 0.058,
              "funding_mean_1h": 0.000060, "funding_std_1h": 0.000055, "oi_usd": 52_000_000.0},
    "HYPE": {"sz_decimals": 2, "base_price": 8.40,     "daily_vol": 0.071,
              "funding_mean_1h": 0.000080, "funding_std_1h": 0.000065, "oi_usd": 42_000_000.0},
}

CEX_FUNDING_BASELINES_8H: dict[str, float] = {
    "BTC": 0.00028, "ETH": 0.00024, "SOL": 0.00042,
    "AVAX": 0.00035, "ARB": 0.00048, "DOGE": 0.00052, "HYPE": 0.00095,
}

# Trade size for slippage simulation (USDC notional)
SLIPPAGE_PROBE_USD: float = 10_000.0


# ── Slippage Calculator ───────────────────────────────────────────────────────

def compute_slippage_bps(
    bids: list[list[float]],
    asks: list[list[float]],
    probe_usd: float = SLIPPAGE_PROBE_USD,
) -> dict[str, float]:
    """
    Walk the L2 book for a hypothetical market buy of `probe_usd` USDC.

    Slippage(V) = (Σ Pᵢ × Qᵢ) / V  −  P_mid
    Returns slippage in bps for both buy (lifting asks) and sell (hitting bids).
    """
    if not bids or not asks:
        return {"buy_slippage_bps": 0.0, "sell_slippage_bps": 0.0, "mid_price": 0.0}

    best_bid = float(bids[0][0])
    best_ask = float(asks[0][0])
    mid = (best_bid + best_ask) / 2.0

    def _walk(levels: list[list[float]], buy_side: bool) -> float:
        remaining = probe_usd
        cost = 0.0
        for level in levels:
            px = float(level[0])
            qty = float(level[1])
            fill_usd = min(remaining, px * qty)
            cost += fill_usd
            remaining -= fill_usd
            if remaining <= 0:
                break
        if cost <= 0 or mid <= 0:
            return 0.0
        vwap = cost / (probe_usd - remaining) if (probe_usd - remaining) > 0 else mid
        slip_bps = ((vwap - mid) / mid * 10_000.0) if buy_side else ((mid - vwap) / mid * 10_000.0)
        return round(max(slip_bps, 0.0), 4)

    buy_slip = _walk(asks, True)
    sell_slip = _walk(bids, False)
    return {
        "buy_slippage_bps": buy_slip,
        "sell_slippage_bps": sell_slip,
        "mid_price": round(mid, 6),
    }


# ── Hyperliquid Client ────────────────────────────────────────────────────────

class HyperliquidClient:
    """
    Async httpx-based client for Hyperliquid L1 public info endpoints.

    All results are cached with a 15-second TTL.
    Falls back to a high-fidelity stochastic mock when the API is unreachable.
    """

    def __init__(self) -> None:
        self.base_url = settings.hl_api_url
        self.network = settings.HL_NETWORK
        self._cache = _TTLCache(ttl_seconds=15.0)
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(8.0),
                headers={"Content-Type": "application/json"},
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ── HTTP Helper ───────────────────────────────────────────────────────

    async def _post(self, payload: dict) -> dict | list | None:
        """POST to /info with TTL cache, 10s timeout, and exponential backoff retry."""
        cache_key = str(sorted(payload.items()))
        cached = self._cache.get(cache_key)
        if cached is not None:
            logger.debug("Cache hit: %s", cache_key[:60])
            return cached

        client = self._get_client()
        backoff = _BASE_BACKOFF
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                resp = await client.post(
                    f"{self.base_url}/info",
                    json=payload,
                    timeout=httpx.Timeout(10.0),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    self._cache.set(cache_key, data)
                    return data
                if resp.status_code in _RETRY_STATUS and attempt < _MAX_RETRIES:
                    logger.warning(
                        "HL API %d on attempt %d/%d for %s — retrying in %.1fs",
                        resp.status_code, attempt, _MAX_RETRIES,
                        payload.get("type"), backoff,
                    )
                    await asyncio.sleep(backoff)
                    backoff *= 2.0
                    continue
                logger.warning(
                    "HL API returned %d for %s (no retry)",
                    resp.status_code, payload.get("type"),
                )
                return None
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                if attempt < _MAX_RETRIES:
                    logger.debug(
                        "HL API network error attempt %d/%d: %s — retrying in %.1fs",
                        attempt, _MAX_RETRIES, exc, backoff,
                    )
                    await asyncio.sleep(backoff)
                    backoff *= 2.0
                else:
                    logger.debug("HL API unreachable after %d attempts: %s — using mock", _MAX_RETRIES, exc)
            except Exception as exc:
                logger.debug("HL API unexpected error: %s — using mock", exc)
                return None
        return None

    # ── Live Funding Rates ────────────────────────────────────────────────

    async def get_live_funding_rates(
        self, assets: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Fetch 1h predicted funding rates. Fetches universe metadata and
        spot prices concurrently. Falls back to stochastic mock on failure.
        """
        target_assets = assets or list(ASSET_CONFIGS.keys())

        meta, spot_meta = await asyncio.gather(
            self._post({"type": "metaAndAssetCtxs"}),
            self._post({"type": "spotMetaAndAssetCtxs"}),
        )

        if meta and isinstance(meta, list) and len(meta) >= 2:
            return self._parse_live_funding(meta, spot_meta, target_assets)

        return self._generate_mock_funding(target_assets)

    def _parse_live_funding(
        self, meta: list, spot_meta: list | None, target_assets: list[str],
    ) -> list[dict[str, Any]]:
        universe_meta = meta[0].get("universe", [])
        asset_ctxs = meta[1] if len(meta) > 1 else []

        spot_prices: dict[str, float] = {}
        if spot_meta and isinstance(spot_meta, list) and len(spot_meta) > 1:
            for idx, item in enumerate(spot_meta[0].get("universe", [])):
                if idx < len(spot_meta[1]):
                    spot_prices[item.get("name", "")] = float(
                        spot_meta[1][idx].get("markPx", 0.0)
                    )

        name_map = {item["name"]: idx for idx, item in enumerate(universe_meta)}
        results = []

        for asset in target_assets:
            idx = name_map.get(asset)
            if idx is None or idx >= len(asset_ctxs):
                continue
            ctx = asset_ctxs[idx]
            funding_1h = float(ctx.get("funding", 0.0))
            mark_price = float(ctx.get("markPx", 0.0))
            oi_usd = float(ctx.get("openInterest", 0.0)) * mark_price
            spot_price = spot_prices.get(asset, mark_price)

            cex_8h = CEX_FUNDING_BASELINES_8H.get(asset, 0.0003)
            hl_ann = funding_1h * 8760 * 100
            cex_ann = cex_8h * 1095 * 100

            results.append({
                "symbol": asset,
                "hl_funding_1h": round(funding_1h, 8),
                "hl_funding_annualized_pct": round(hl_ann, 2),
                "cex_funding_8h": round(cex_8h, 8),
                "cex_funding_annualized_pct": round(cex_ann, 2),
                "spread_annualized_pct": round(hl_ann - cex_ann, 2),
                "hl_mark_price": round(mark_price, 4),
                "hl_spot_price": round(spot_price, 4),
                "hl_open_interest_usd": round(oi_usd, 0),
                "volume_24h_usd": 0.0,  # populated from separate call if available
            })

        return results

    def _generate_mock_funding(
        self, target_assets: list[str],
    ) -> list[dict[str, Any]]:
        results = []
        for asset in target_assets:
            cfg = ASSET_CONFIGS.get(asset, ASSET_CONFIGS["BTC"])
            funding_1h = float(np.random.normal(cfg["funding_mean_1h"], cfg["funding_std_1h"]))
            if np.random.rand() < 0.08:
                funding_1h = -abs(funding_1h) * np.random.uniform(0.3, 1.5)
            funding_1h = float(np.clip(funding_1h, -0.0008, 0.0015))
            mark_price = cfg["base_price"] * (1.0 + np.random.uniform(-0.012, 0.012))

            cex_8h = CEX_FUNDING_BASELINES_8H.get(asset, 0.0003)
            cex_8h_noised = cex_8h + np.random.normal(0, cex_8h * 0.15)
            hl_ann = funding_1h * 8760 * 100
            cex_ann = cex_8h_noised * 1095 * 100

            # Simulated 24h volume
            vol_24h = cfg["oi_usd"] * np.random.uniform(0.3, 0.8)

            results.append({
                "symbol": asset,
                "hl_funding_1h": round(funding_1h, 8),
                "hl_funding_annualized_pct": round(float(hl_ann), 2),
                "cex_funding_8h": round(float(cex_8h_noised), 8),
                "cex_funding_annualized_pct": round(float(cex_ann), 2),
                "spread_annualized_pct": round(float(hl_ann - cex_ann), 2),
                "hl_mark_price": round(float(mark_price), 2),
                "hl_spot_price": round(float(mark_price * 0.9998), 2),
                "hl_open_interest_usd": round(float(cfg["oi_usd"] * np.random.uniform(0.9, 1.1)), 0),
                "volume_24h_usd": round(float(vol_24h), 0),
            })

        return results

    # ── L2 Order Book & Slippage ──────────────────────────────────────────

    async def get_l2_snapshot(self, asset: str) -> dict[str, Any] | None:
        """Fetch L2 order book snapshot for `asset` with 15s cache."""
        data = await self._post({"type": "l2Book", "coin": asset})
        if data and isinstance(data, dict) and "levels" in data:
            return data
        return None

    async def get_slippage(
        self, asset: str, probe_usd: float = SLIPPAGE_PROBE_USD,
    ) -> dict[str, float]:
        """
        Compute instantaneous buy/sell slippage for `probe_usd` USDC notional.
        Returns mock estimate when the live book is unavailable.
        """
        book = await self.get_l2_snapshot(asset)
        if book:
            levels = book.get("levels", [[], []])
            bids = [[float(x[0]), float(x[1])] for x in (levels[0] if len(levels) > 0 else [])]
            asks = [[float(x[0]), float(x[1])] for x in (levels[1] if len(levels) > 1 else [])]
            return compute_slippage_bps(bids, asks, probe_usd)

        # Mock: realistic slippage based on liquidity tier
        cfg = ASSET_CONFIGS.get(asset, ASSET_CONFIGS["BTC"])
        liq_factor = 1e9 / max(cfg["oi_usd"], 1e6)
        slip = float(np.clip(0.5 + liq_factor * 10 + np.random.exponential(0.3), 0.2, 8.0))
        mid = cfg["base_price"] * (1.0 + np.random.uniform(-0.005, 0.005))
        return {
            "buy_slippage_bps": round(slip, 3),
            "sell_slippage_bps": round(slip * 0.95, 3),
            "mid_price": round(mid, 4),
        }

    async def get_slippage_multi(
        self, assets: list[str], probe_usd: float = SLIPPAGE_PROBE_USD,
    ) -> dict[str, dict[str, float]]:
        """Concurrently fetch slippage for multiple assets."""
        results_list = await asyncio.gather(
            *[self.get_slippage(a, probe_usd) for a in assets],
            return_exceptions=True,
        )
        out: dict[str, dict[str, float]] = {}
        for asset, res in zip(assets, results_list):
            if isinstance(res, Exception):
                out[asset] = {"buy_slippage_bps": 0.0, "sell_slippage_bps": 0.0, "mid_price": 0.0}
            else:
                out[asset] = res  # type: ignore[assignment]
        return out

    # ── Historical Data Generator ─────────────────────────────────────────

    def generate_historical_series(
        self,
        assets: list[str],
        start_date: str,
        end_date: str,
        interval_hours: int = 1,
        seed: int = 42,
    ) -> list[dict[str, Any]]:
        """
        Synthetic hourly mark prices + 1h funding using correlated GBM
        (prices) and mean-reverting OU process (funding rates) with
        Poisson funding jumps (~2%/h probability).
        """
        np.random.seed(seed)

        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        if end_dt <= start_dt:
            end_dt = start_dt + timedelta(days=90)

        total_hours = int((end_dt - start_dt).total_seconds() / 3600)
        n_steps = total_hours // interval_hours
        records: list[dict[str, Any]] = []

        for asset in assets:
            cfg = ASSET_CONFIGS.get(asset, ASSET_CONFIGS["BTC"])

            # GBM prices
            dt = interval_hours / 24.0
            drift = 0.12 * dt / 365.0
            vol = cfg["daily_vol"] * (dt**0.5)
            log_rets = drift - 0.5 * vol**2 + vol * np.random.normal(0, 1, n_steps)
            prices = cfg["base_price"] * np.exp(np.cumsum(log_rets))

            # OU funding process
            funding = np.zeros(n_steps)
            funding[0] = cfg["funding_mean_1h"]
            theta, sigma_f = 0.08, cfg["funding_std_1h"] * 0.4
            for i in range(1, n_steps):
                jump = np.random.choice([-0.0004, 0.0006, 0.001]) if np.random.rand() < 0.02 else 0.0
                funding[i] = (
                    funding[i - 1]
                    + theta * (cfg["funding_mean_1h"] - funding[i - 1])
                    + np.random.normal(0, sigma_f)
                    + jump
                )
            funding = np.clip(funding, -0.001, 0.002)

            basis_bps = funding * 10_000 * 0.6 + np.random.normal(0, 2.5, n_steps)
            cex_8h = CEX_FUNDING_BASELINES_8H.get(asset, 0.0003)
            cex_8h_arr = cex_8h + np.random.normal(0, cex_8h * 0.15, n_steps)

            for i in range(n_steps):
                ts = start_dt + timedelta(hours=i * interval_hours)
                px = float(prices[i])
                records.append({
                    "epoch": i,
                    "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
                    "asset": asset,
                    "mark_price": round(px, 4 if px < 10 else 2),
                    "funding_rate_1h": round(float(funding[i]), 8),
                    "funding_annualized_pct": round(float(funding[i] * 8760 * 100), 2),
                    "cex_funding_rate_8h": round(float(cex_8h_arr[i]), 8),
                    "basis_bps": round(float(basis_bps[i]), 2),
                    "interval_hours": interval_hours,
                })

        return records
