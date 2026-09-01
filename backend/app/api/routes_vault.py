"""
HyperVault Alpha — Vault Routes

GET /api/vault/stats → Simulated User Vault KPIs (NAV, share price, HWM, depositor PnL).
"""

from fastapi import APIRouter

from app.models.schemas import BacktestRequest, VaultStats
from app.engine.hl_client import HyperliquidClient
from app.engine.basis_engine import BasisEngine
from app.engine.vault_model import VaultModel

router = APIRouter(prefix="/api/vault", tags=["Vault Simulation"])

hl_client = HyperliquidClient()


@router.get("/stats", response_model=VaultStats)
async def get_vault_stats():
    """
    Run a default backtest and return the vault state snapshot including
    share price, HWM, depositor breakdown, and accrued performance fees.
    """
    request = BacktestRequest(vault_mode=True)

    raw_data = hl_client.generate_historical_series(
        assets=request.assets,
        start_date=request.start_date,
        end_date=request.end_date,
        interval_hours=1,
    )

    engine = BasisEngine(request)
    equity_curve, _, _ = engine.run(raw_data)

    vault = VaultModel(request)
    return vault.get_stats(equity_curve)
