"""
HyperVault Alpha — Market Routes

GET /api/market/funding → Live HL 1h vs CEX 8h funding rate comparison.
"""

from fastapi import APIRouter

from app.engine.hl_client import HyperliquidClient
from app.models.schemas import FundingSnapshot, FundingRateRow
from app.config import settings

from datetime import datetime, timezone

router = APIRouter(prefix="/api/market", tags=["Market Data"])

hl_client = HyperliquidClient()


def _classify_signal(spread: float) -> str:
    if spread > 25.0:
        return "STRONG_LONG"
    elif spread > 8.0:
        return "LONG"
    elif spread > -5.0:
        return "NEUTRAL"
    elif spread > -15.0:
        return "SHORT"
    return "STRONG_SHORT"


@router.get("/funding", response_model=FundingSnapshot)
async def get_live_funding():
    """
    Returns current HL 1-hour predicted funding rates compared against
    aggregated CEX 8-hour rates (Binance / Bybit / OKX weighted).
    """
    raw_rates = await hl_client.get_live_funding_rates()

    rates: list[FundingRateRow] = []
    for r in raw_rates:
        signal = _classify_signal(r["spread_annualized_pct"])
        rates.append(FundingRateRow(**r, signal=signal))

    # Sort by absolute spread (best opportunities first)
    rates.sort(key=lambda x: abs(x.spread_annualized_pct), reverse=True)

    avg_hl = sum(r.hl_funding_annualized_pct for r in rates) / max(len(rates), 1)
    avg_cex = sum(r.cex_funding_annualized_pct for r in rates) / max(len(rates), 1)

    return FundingSnapshot(
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        network=settings.HL_NETWORK,
        rates=rates,
        avg_hl_annualized_pct=round(avg_hl, 2),
        avg_cex_annualized_pct=round(avg_cex, 2),
        avg_spread_pct=round(avg_hl - avg_cex, 2),
        best_opportunity=rates[0] if rates else None,
    )
