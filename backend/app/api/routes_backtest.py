"""
HyperVault Alpha — Backtest Routes

POST /api/backtest/run → Execute vectorized basis + funding backtest.
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import BacktestRequest, BacktestResponse
from app.engine.hl_client import HyperliquidClient
from app.engine.basis_engine import BasisEngine
from app.engine.vault_model import VaultModel
from app.engine.metrics import MetricsCalculator

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
        engine = BasisEngine(request)
        equity_curve, trades, attribution = engine.run(raw_data)

        # 3. Compute summary metrics
        summary = MetricsCalculator.compute(request, equity_curve, trades)

        # 4. If vault mode, apply HWM fees to final NAV
        if request.vault_mode and equity_curve:
            vault = VaultModel(request)
            for snap in equity_curve:
                vault.apply_epoch_pnl(snap.nav)
            # Adjust final NAV for accrued fees
            summary.final_nav = round(
                summary.final_nav - vault.accrued_fees, 2
            )

        return BacktestResponse(
            request=request,
            summary=summary,
            equity_curve=equity_curve,
            trades=trades,
            attribution=attribution,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Backtest engine error: {str(e)}",
        )
