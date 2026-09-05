"""
Synthro — /api/v1/live-funding

GET /api/v1/live-funding
  Returns sorted funding rates, annualized APRs, 24h volume,
  instantaneous L2 slippage, and arbitrage signal tags across active tokens.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Query

from app.engine.hl_client import HyperliquidClient, SLIPPAGE_PROBE_USD
from app.models.schemas import FundingSnapshot, FundingRateRow, SlippageData
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["v1 — Market Data"])

_hl = HyperliquidClient()


def _signal(spread: float) -> str:
    if spread > 25.0:   return "STRONG_LONG"
    if spread > 8.0:    return "LONG"
    if spread > -5.0:   return "NEUTRAL"
    if spread > -15.0:  return "SHORT"
    return "STRONG_SHORT"


def _arb_tag(row: dict) -> str:
    """Generate a short human-readable arbitrage opportunity tag."""
    spread = row.get("spread_annualized_pct", 0.0)
    if spread > 30:
        return "🔥 PRIME BASIS — High carry, deploy now"
    if spread > 15:
        return "✅ STRONG CARRY — HL funding premium significant"
    if spread > 5:
        return "📈 MILD CARRY — Monitor for entry"
    if spread < -10:
        return "🔻 NEGATIVE CARRY — CEX pays more; reverse or avoid"
    return "⚖️ NEUTRAL — No clear edge"


@router.get("/live-funding", response_model=FundingSnapshot, summary="Live Funding Rate Matrix")
async def get_live_funding_v1(
    assets: str | None = Query(
        default=None,
        description="Comma-separated list of assets, e.g. BTC,ETH,SOL. Defaults to all.",
    ),
    include_slippage: bool = Query(
        default=True,
        description="Fetch live L2 order book slippage for each asset (adds ~150ms).",
    ),
):
    """
    Returns real-time (or mock) Hyperliquid 1h funding rates vs aggregated
    CEX 8h rates, sorted by absolute arbitrage spread.

    Each row includes:
    - HL and CEX annualized funding APRs
    - Arbitrage spread and signal classification
    - 24h open interest and volume
    - Instantaneous $10k USDC slippage from the L2 order book
    """
    asset_list: list[str] | None = None
    if assets:
        asset_list = [a.strip().upper() for a in assets.split(",") if a.strip()]

    # Fetch funding rates (cached 15s)
    raw_rates = await _hl.get_live_funding_rates(asset_list)

    # Optionally fetch L2 slippage concurrently
    slippage_map: dict = {}
    if include_slippage and raw_rates:
        symbols = [r["symbol"] for r in raw_rates]
        slippage_map = await _hl.get_slippage_multi(symbols, probe_usd=SLIPPAGE_PROBE_USD)

    rates: list[FundingRateRow] = []
    total_oi = 0.0

    for r in raw_rates:
        sym = r["symbol"]
        slip_raw = slippage_map.get(sym)
        slip_obj: SlippageData | None = None
        if slip_raw:
            slip_obj = SlippageData(
                buy_slippage_bps=slip_raw["buy_slippage_bps"],
                sell_slippage_bps=slip_raw["sell_slippage_bps"],
                mid_price=slip_raw["mid_price"],
                probe_usd=SLIPPAGE_PROBE_USD,
            )
        total_oi += r.get("hl_open_interest_usd", 0.0)
        rates.append(
            FundingRateRow(
                **{k: v for k, v in r.items() if k in FundingRateRow.model_fields},
                signal=_signal(r["spread_annualized_pct"]),
                slippage=slip_obj,
                arbitrage_tag=_arb_tag(r),
            )
        )

    # Sort by absolute spread (best opportunities first)
    rates.sort(key=lambda x: abs(x.spread_annualized_pct), reverse=True)

    n = max(len(rates), 1)
    avg_hl = sum(r.hl_funding_annualized_pct for r in rates) / n
    avg_cex = sum(r.cex_funding_annualized_pct for r in rates) / n

    return FundingSnapshot(
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        network=settings.HL_NETWORK,
        rates=rates,
        avg_hl_annualized_pct=round(avg_hl, 2),
        avg_cex_annualized_pct=round(avg_cex, 2),
        avg_spread_pct=round(avg_hl - avg_cex, 2),
        best_opportunity=rates[0] if rates else None,
        total_open_interest_usd=round(total_oi, 0),
    )
