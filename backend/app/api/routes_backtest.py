"""
HyperVault Alpha — Backtest Routes

POST /api/backtest/run → Execute vectorized basis + funding backtest.
"""

from fastapi import APIRouter, HTTPException
import traceback
import logging

from app.models.schemas import BacktestRequest, BacktestResponse
from app.engine.hl_client import HyperliquidClient
from app.engine.basis_engine import BasisBacktestEngine
from app.engine.vault_model import HyperliquidVaultSimulator
from app.engine.metrics import MetricsCalculator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/backtest", tags=["Backtest Engine"])

hl_client = HyperliquidClient()


@router.post("/run", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest):
    """
    Execute a full basis + funding arbitrage backtest using synthetic
    hourly data (or cached historical data when available).
    """
    try:
        # 1. Generate/load hourly historical data
        raw_data = hl_client.generate_historical_series(
            assets=request.assets,
            start_date=request.start_date,
            end_date=request.end_date,
            interval_hours=1,
        )

        # 2. Run vectorized basis engine
        engine = BasisBacktestEngine(request)
        equity_curve, trades, attribution = engine.run(raw_data)

        # 3. If vault mode, apply HWM fees
        if request.vault_mode and equity_curve:
            vault = HyperliquidVaultSimulator(request)
            for snap in equity_curve:
                vault.apply_epoch_pnl(snap.timestamp, snap.nav)
            
            # Adjust final NAV in the last snapshot to reflect fee extraction
            equity_curve[-1].nav -= vault.accrued_fees
            # Calculate vault stats (discarded here, but could be added to response if schema updated)
            _ = vault.get_stats(equity_curve)

        # 4. Compute summary metrics based on final curve
        summary = MetricsCalculator.compute(request, equity_curve, trades)

        return BacktestResponse(
            request=request,
            summary=summary,
            equity_curve=equity_curve,
            trades=trades,
            attribution=attribution,
        )

    except Exception as e:
        logger.error(f"Backtest engine error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Backtest engine error: {str(e)}",
        )
