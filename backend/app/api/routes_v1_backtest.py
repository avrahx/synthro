"""
Synthro — /api/v1/backtest

POST /api/v1/backtest
  Executes the Polars-native QuantEngine backtest pipeline.
  Supports unwind_negative_funding regime filter.
"""

from __future__ import annotations

import logging
import traceback

from fastapi import APIRouter, HTTPException

from app.models.schemas import BacktestRequest, BacktestResponse, SummaryMetrics, EquitySnapshot, TradeRecord, AssetAttribution
from app.engine.hl_client import HyperliquidClient
from app.engine.quant_engine import QuantEngine, QuantConfig
from app.engine.vault_model import HyperliquidVaultSimulator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["v1 — Backtest Engine"])

_hl = HyperliquidClient()


@router.post("/backtest", response_model=BacktestResponse, summary="Run Vectorized Backtest")
async def run_backtest_v1(request: BacktestRequest):
    """
    Executes a full basis + funding arbitrage backtest using synthetic
    hourly time-series data generated from calibrated GBM + OU processes.

    The Polars-native QuantEngine computes all analytics in Rust-threaded
    vectorized expressions.

    Key outputs:
    - Full hourly equity curve with NAV, drawdown, period return
    - Sharpe, Sortino, Calmar, Ulcer, Omega risk ratios
    - Cost bridge: gross funding yield → net profit after fees + slippage + borrow
    - Per-asset PnL attribution
    - Trade-level rebalance log

    Set `unwind_negative_funding: true` to activate the regime sensitivity
    filter: positions are zeroed out during epochs where 1h funding has
    been negative for > 3 consecutive hours per asset.
    """
    try:
        # 1 — Generate synthetic historical series
        raw_data = _hl.generate_historical_series(
            assets=request.assets,
            start_date=request.start_date,
            end_date=request.end_date,
            interval_hours=1,
        )

        # 2 — Build QuantConfig from request
        cfg = QuantConfig(
            assets=request.assets,
            initial_capital=request.initial_capital,
            taker_fee_bps=request.taker_fee_bps,
            maker_fee_bps=request.maker_fee_bps,
            slippage_bps=request.slippage_bps,
            margin_borrow_apr=request.margin_borrow_apr,
            rebalance_freq_hours=request.rebalance_freq_hours,
            max_leverage=request.max_leverage,
            strategy_mode=request.strategy_mode,
            vault_mode=request.vault_mode,
            leader_stake_pct=request.leader_stake_pct,
            hwm_fee_pct=request.hwm_fee_pct,
            unwind_negative_funding=request.unwind_negative_funding,
        )

        # 3 — Run Polars QuantEngine
        engine = QuantEngine(cfg)
        result = engine.run(raw_data)

        # 4 — Optionally apply vault HWM fees
        equity_snapshots = [EquitySnapshot(**e) for e in result.equity_curve]
        if request.vault_mode and equity_snapshots:
            vault = HyperliquidVaultSimulator(request)
            for snap in equity_snapshots:
                vault.apply_epoch_pnl(snap.timestamp, snap.nav)
            equity_snapshots[-1].nav -= vault.accrued_fees

        # 5 — Build Pydantic response from quant_engine output
        summary = SummaryMetrics(**result.metrics)
        trades = [TradeRecord(**t) for t in result.trades]
        attribution = [AssetAttribution(**a) for a in result.attribution]

        return BacktestResponse(
            request=request,
            summary=summary,
            equity_curve=equity_snapshots,
            trades=trades,
            attribution=attribution,
        )

    except Exception as exc:
        logger.error("Backtest v1 error: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Backtest engine error: {exc}")
