"""
HyperVault Alpha — Vault Routes

GET /api/vault/stats → Simulated User Vault KPIs (NAV, share price, HWM, depositor PnL).
"""

from fastapi import APIRouter

from app.models.schemas import BacktestRequest, VaultStats
from app.engine.hl_client import HyperliquidClient
from app.engine.basis_engine import BasisBacktestEngine
from app.engine.vault_model import HyperliquidVaultSimulator

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

    engine = BasisBacktestEngine(
        initial_capital=request.initial_capital,
        assets=request.assets,
        rebalance_freq_hours=request.rebalance_freq_hours,
        taker_fee_bps=request.taker_fee_bps,
        slippage_bps=request.slippage_bps,
        margin_borrow_apr=request.margin_borrow_apr,
        strategy_mode=request.strategy_mode
    )
    equity_curve, _, _ = engine.run(raw_data)

    vault = HyperliquidVaultSimulator(
        leader_capital=request.initial_capital * (request.leader_stake_pct / 100),
        follower_capital=request.initial_capital * (1 - (request.leader_stake_pct / 100)),
        leader_stake_pct=request.leader_stake_pct,
        hwm_fee_pct=request.hwm_fee_pct
    )
    return vault.get_stats(equity_curve)
