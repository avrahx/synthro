"""
HyperVault Alpha — Hyperliquid API Client Wrapper

Provides a unified interface to the Hyperliquid Info API with a
high-fidelity mock fallback for offline development. Uses aiohttp
for async HTTP, falling back to synchronous requests when needed.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# ── Asset universe with realistic HL-native parameters ───────────────────────

ASSET_CONFIGS: dict[str, dict[str, Any]] = {
    "BTC": {
        "sz_decimals": 5, "base_price": 67_500.0, "daily_vol": 0.025,
        "funding_mean_1h": 0.000035, "funding_std_1h": 0.000022,
        "oi_usd": 1_450_000_000.0,
    },
    "ETH": {
        "sz_decimals": 4, "base_price": 3_620.0, "daily_vol": 0.032,
        "funding_mean_1h": 0.000030, "funding_std_1h": 0.000028,
        "oi_usd": 820_000_000.0,
    },
    "SOL": {
        "sz_decimals": 2, "base_price": 172.0, "daily_vol": 0.048,
        "funding_mean_1h": 0.000048, "funding_std_1h": 0.000038,
        "oi_usd": 380_000_000.0,
    },
    "AVAX": {
        "sz_decimals": 2, "base_price": 33.5, "daily_vol": 0.055,
        "funding_mean_1h": 0.000040, "funding_std_1h": 0.000042,
        "oi_usd": 95_000_000.0,
    },
    "ARB": {
        "sz_decimals": 1, "base_price": 0.82, "daily_vol": 0.062,
        "funding_mean_1h": 0.000055, "funding_std_1h": 0.000050,
        "oi_usd": 68_000_000.0,
    },
    "DOGE": {
        "sz_decimals": 0, "base_price": 0.125, "daily_vol": 0.058,
        "funding_mean_1h": 0.000060, "funding_std_1h": 0.000055,
        "oi_usd": 52_000_000.0,
    },
}

# CEX aggregate 8h funding baselines (Binance / Bybit / OKX weighted average)
CEX_FUNDING_BASELINES_8H: dict[str, float] = {
    "BTC": 0.00028,
    "ETH": 0.00024,
    "SOL": 0.00042,
    "AVAX": 0.00035,
    "ARB": 0.00048,
    "DOGE": 0.00052,
}


class HyperliquidClient:
    """
    Async wrapper around the Hyperliquid Info API.

    Falls back to a high-fidelity stochastic mock generator when the
    live API is unavailable (offline dev, CI, or testnet downtime).
    """

    def __init__(self) -> None:
        self.base_url = settings.hl_api_url
        self.network = settings.HL_NETWORK
        self._session = None

    # ── Live API Helpers ─────────────────────────────────────────────────

    async def _post(self, endpoint: str, payload: dict) -> dict | list | None:
        """POST to HL Info API. Returns None on failure."""
        try:
            import aiohttp
            if self._session is None or self._session.closed:
                self._session = aiohttp.ClientSession()
            url = f"{self.base_url}{endpoint}"
            async with self._session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    return await resp.json()
                logger.warning("HL API %s returned %d", endpoint, resp.status)
                return None
        except Exception as exc:
            logger.debug("HL API unreachable (%s), using mock data", exc)
            return None

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    # ── Funding Rates ────────────────────────────────────────────────────

    async def get_live_funding_rates(
        self, assets: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Fetch predicted 1-hour funding rates from Hyperliquid.
        Falls back to mock generator if the API is unreachable.
        """
        target_assets = assets or list(ASSET_CONFIGS.keys())

        # Try live API first
        meta = await self._post("/info", {"type": "metaAndAssetCtxs"})
        if meta and isinstance(meta, list) and len(meta) >= 2:
            return self._parse_live_funding(meta, target_assets)

        # Fallback: high-fidelity mock
        return self._generate_mock_funding(target_assets)

    def _parse_live_funding(
        self, meta: list, target_assets: list[str],
    ) -> list[dict[str, Any]]:
        """Parse metaAndAssetCtxs response into funding rows."""
        universe_meta = meta[0].get("universe", [])
        asset_ctxs = meta[1] if len(meta) > 1 else []

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
                "hl_open_interest_usd": round(oi_usd, 0),
            })

        return results

    def _generate_mock_funding(
        self, target_assets: list[str],
    ) -> list[dict[str, Any]]:
        """Generate realistic mock 1h funding rates with HL-specific dynamics."""
        results = []

        for asset in target_assets:
            cfg = ASSET_CONFIGS.get(asset, ASSET_CONFIGS["BTC"])
            funding_1h = float(np.random.normal(
                cfg["funding_mean_1h"], cfg["funding_std_1h"],
            ))
            # Occasional negative funding (shorts pay longs) — ~8% probability
            if np.random.rand() < 0.08:
                funding_1h = -abs(funding_1h) * np.random.uniform(0.3, 1.5)

            funding_1h = np.clip(funding_1h, -0.0008, 0.0015)
            mark_price = cfg["base_price"] * (1.0 + np.random.uniform(-0.012, 0.012))

            cex_8h = CEX_FUNDING_BASELINES_8H.get(asset, 0.0003)
            cex_8h_noised = cex_8h + np.random.normal(0, cex_8h * 0.15)

            hl_ann = funding_1h * 8760 * 100
            cex_ann = cex_8h_noised * 1095 * 100

            results.append({
                "symbol": asset,
                "hl_funding_1h": round(float(funding_1h), 8),
                "hl_funding_annualized_pct": round(float(hl_ann), 2),
                "cex_funding_8h": round(float(cex_8h_noised), 8),
                "cex_funding_annualized_pct": round(float(cex_ann), 2),
                "spread_annualized_pct": round(float(hl_ann - cex_ann), 2),
                "hl_mark_price": round(float(mark_price), 2),
                "hl_open_interest_usd": round(float(
                    cfg["oi_usd"] * np.random.uniform(0.9, 1.1)
                ), 0),
            })

        return results

    # ── Historical Data (for backtests) ──────────────────────────────────

    def generate_historical_series(
        self,
        assets: list[str],
        start_date: str,
        end_date: str,
        interval_hours: int = 1,
        seed: int = 42,
    ) -> list[dict[str, Any]]:
        """
        Generate synthetic hourly mark prices and 1h funding rates using
        correlated GBM + mean-reverting OU funding dynamics.
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

            # GBM for mark prices
            dt = interval_hours / 24.0
            drift = 0.12 * dt / 365.0   # ~12% annual drift
            vol = cfg["daily_vol"] * np.sqrt(dt)
            shocks = np.random.normal(0, 1, n_steps)
            log_returns = drift - 0.5 * vol**2 + vol * shocks
            prices = cfg["base_price"] * np.exp(np.cumsum(log_returns))

            # OU process for 1h funding rates
            funding = np.zeros(n_steps)
            funding[0] = cfg["funding_mean_1h"]
            theta = 0.08      # mean-reversion speed
            sigma_f = cfg["funding_std_1h"] * 0.4

            for i in range(1, n_steps):
                dW = np.random.normal(0, sigma_f)
                # Poisson jump (~2% chance per hour of funding spike)
                jump = 0.0
                if np.random.rand() < 0.02:
                    jump = np.random.choice([-0.0004, 0.0006, 0.001])
                funding[i] = (
                    funding[i - 1]
                    + theta * (cfg["funding_mean_1h"] - funding[i - 1])
                    + dW + jump
                )
            funding = np.clip(funding, -0.001, 0.002)

            # Basis spread derived from funding pressure
            basis_bps = funding * 10_000 * 0.6 + np.random.normal(0, 2.5, n_steps)

            # CEX 8h funding baselines
            cex_8h = CEX_FUNDING_BASELINES_8H.get(asset, 0.0003)
            cex_8h_noised = cex_8h + np.random.normal(0, cex_8h * 0.15, n_steps)

            for i in range(n_steps):
                ts = start_dt + timedelta(hours=i * interval_hours)
                records.append({
                    "epoch": i,
                    "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
                    "asset": asset,
                    "mark_price": round(float(prices[i]), 4 if prices[i] < 10 else 2),
                    "funding_rate_1h": round(float(funding[i]), 8),
                    "funding_annualized_pct": round(float(funding[i] * 8760 * 100), 2),
                    "cex_funding_rate_8h": round(float(cex_8h_noised[i]), 8),
                    "basis_bps": round(float(basis_bps[i]), 2),
                    "interval_hours": interval_hours,
                })

        return records
