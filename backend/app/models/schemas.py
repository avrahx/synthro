"""
Synthro — Pydantic v2 Schemas

Domain models for backtest requests/responses, live funding snapshots,
vault simulation, stress-test, slippage, and trade execution records.
"""

from __future__ import annotations

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════
#  BACKTEST
# ═══════════════════════════════════════════════════════════════════════════════

class BacktestRequest(BaseModel):
    """Parameters for a vectorized basis + funding arbitrage backtest."""
    assets: list[str] = Field(
        default=["BTC", "ETH", "SOL", "AVAX", "ARB", "DOGE"],
        description="Target perpetual assets on Hyperliquid",
    )
    start_date: str = Field(default="2024-06-01", description="Backtest start YYYY-MM-DD")
    end_date: str = Field(default="2025-01-01", description="Backtest end YYYY-MM-DD")
    initial_capital: float = Field(default=100_000.0, ge=1_000.0)
    taker_fee_bps: float = Field(default=3.5, ge=0.0, description="HL taker fee in bps")
    maker_fee_bps: float = Field(default=0.2, ge=0.0, description="HL maker rebate-adjusted bps")
    slippage_bps: float = Field(default=2.0, ge=0.0, description="Execution slippage bps")
    rebalance_freq_hours: int = Field(default=3, ge=1)
    margin_borrow_apr: float = Field(default=0.05, ge=0.0)
    strategy_mode: Literal[
        "INTRA_HL_CASH_AND_CARRY",
        "CROSS_VENUE_DISLOCATION",
        "VOLATILITY_ADJUSTED_HARVEST",
    ] = Field(default="CROSS_VENUE_DISLOCATION")
    max_leverage: float = Field(default=3.0, ge=1.0, le=20.0)
    vault_mode: bool = Field(default=True)
    leader_stake_pct: float = Field(default=5.0, ge=5.0, le=100.0)
    hwm_fee_pct: float = Field(default=10.0, ge=0.0, le=50.0)
    # Regime sensitivity
    unwind_negative_funding: bool = Field(
        default=False,
        description="Unwind position when 1h funding < 0 for >3 consecutive hours",
    )


class TradeRecord(BaseModel):
    """Single execution event in the simulation."""
    id: str
    epoch: int
    timestamp: str
    asset: str
    action: Literal["OPEN_BASIS", "CLOSE_BASIS", "REBALANCE", "FUNDING_SETTLE"]
    side: Literal["LONG_SPOT_SHORT_PERP", "SHORT_SPOT_LONG_PERP", "FLAT"]
    notional_usd: float
    mark_price: float
    basis_bps: float
    funding_rate_1h: float
    fee_paid: float
    pnl_realized: float = 0.0


class EquitySnapshot(BaseModel):
    """Point-in-time portfolio state."""
    epoch: int
    timestamp: str
    nav: float
    benchmark_nav: float
    cash: float
    spot_value: float
    perp_value: float
    cumulative_funding_received: float
    cumulative_fees_paid: float
    cumulative_slippage_cost: float
    gross_apr: float
    net_apr: float
    drawdown_pct: float
    period_pnl: float = 0.0
    period_return_pct: float = 0.0


class SummaryMetrics(BaseModel):
    """Aggregate risk-adjusted performance statistics."""
    total_return_pct: float
    cagr: float
    annualized_return_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    max_drawdown_pct: float
    longest_underwater_hours: int
    ulcer_index: float
    omega_ratio: float
    win_rate_pct: float
    profit_factor: float
    total_trades: int
    gross_yield_usd: float
    total_funding_usd: float
    total_fees_usd: float
    total_slippage_usd: float
    margin_borrow_cost_usd: float
    net_profit_usd: float
    final_nav: float
    initial_capital: float


class AssetAttribution(BaseModel):
    """Per-asset PnL breakdown."""
    asset: str
    allocated_notional: float
    funding_earned: float
    basis_pnl: float
    fees_paid: float
    net_pnl: float
    trade_count: int


class BacktestResponse(BaseModel):
    """Complete backtest result payload."""
    request: BacktestRequest
    summary: SummaryMetrics
    equity_curve: list[EquitySnapshot]
    trades: list[TradeRecord]
    attribution: list[AssetAttribution]


# ═══════════════════════════════════════════════════════════════════════════════
#  LIVE FUNDING
# ═══════════════════════════════════════════════════════════════════════════════

class SlippageData(BaseModel):
    """L2-derived instantaneous slippage for a $10k USDC probe trade."""
    buy_slippage_bps: float
    sell_slippage_bps: float
    mid_price: float
    probe_usd: float = 10_000.0


class FundingRateRow(BaseModel):
    """Single asset funding comparison row."""
    symbol: str
    hl_funding_1h: float
    hl_funding_annualized_pct: float
    cex_funding_8h: float
    cex_funding_annualized_pct: float
    spread_annualized_pct: float
    hl_mark_price: float
    hl_spot_price: float = 0.0
    hl_open_interest_usd: float
    volume_24h_usd: float = 0.0
    signal: Literal["STRONG_LONG", "LONG", "NEUTRAL", "SHORT", "STRONG_SHORT"]
    slippage: Optional[SlippageData] = None
    arbitrage_tag: str = ""


class FundingSnapshot(BaseModel):
    """Aggregated funding rate comparison across venues."""
    timestamp: str
    network: Literal["testnet", "mainnet"]
    rates: list[FundingRateRow]
    avg_hl_annualized_pct: float
    avg_cex_annualized_pct: float
    avg_spread_pct: float
    best_opportunity: Optional[FundingRateRow] = None
    total_open_interest_usd: float = 0.0


# ═══════════════════════════════════════════════════════════════════════════════
#  STRESS TEST
# ═══════════════════════════════════════════════════════════════════════════════

class StressTestRequest(BaseModel):
    """Parameters for a Black Swan margin & liquidation stress simulation."""
    portfolio_capital: float = Field(default=100_000.0, ge=1_000.0)
    leverage_ratio: float = Field(default=3.0, ge=1.0, le=20.0)
    spot_price_shock_pct: float = Field(
        default=-0.30, ge=-0.70, le=1.00,
        description="Fractional spot price shock, e.g. -0.40 for -40%",
    )
    basis_divergence_bps: float = Field(
        default=0.0, ge=-500.0, le=500.0,
        description="Basis divergence in bps applied to the perp leg",
    )
    maintenance_margin_req: float = Field(
        default=0.05, ge=0.01, le=0.50,
        description="Maintenance margin ratio (e.g. 0.05 for 5%)",
    )
    funding_rate_shock_pct: float = Field(
        default=0.0,
        description="Additional annualized funding rate change (%)",
    )
    scenario_label: str = Field(default="Custom Shock", max_length=80)


class StressTestScenario(BaseModel):
    """Result of a single stress scenario."""
    scenario_label: str
    spot_price_shock_pct: float
    basis_divergence_bps: float
    new_spot_notional: float
    perp_pnl: float
    portfolio_nav: float
    margin_ratio: float
    margin_health_pct: float
    distance_to_liquidation_pct: float
    required_unwind_usd: float
    is_liquidated: bool
    is_margin_call: bool
    funding_impact_24h_usd: float


class StressTestResponse(BaseModel):
    """Full stress test result with multiple scenario sweeps."""
    request: StressTestRequest
    primary_scenario: StressTestScenario
    # Sweep across price shocks from -70% to +100% at fixed basis
    price_shock_sweep: list[StressTestScenario]
    # Sweep across basis divergence at fixed price shock
    basis_sweep: list[StressTestScenario]
    liquidation_threshold_pct: float
    margin_call_threshold_pct: float
    max_safe_leverage: float


# ═══════════════════════════════════════════════════════════════════════════════
#  VAULT SIMULATION
# ═══════════════════════════════════════════════════════════════════════════════

class VaultDepositor(BaseModel):
    address: str
    deposit_usd: float
    shares: float
    current_value_usd: float
    pnl_usd: float
    pnl_pct: float


class SharePriceHistory(BaseModel):
    timestamp: str
    share_price: float
    hwm: float


class VaultStats(BaseModel):
    vault_name: str
    leader_address: str
    total_deposits_usd: float
    total_nav_usd: float
    share_price: float
    high_water_mark: float
    leader_stake_usd: float
    leader_stake_pct: float
    hwm_fee_pct: float
    accrued_performance_fee_usd: float
    fee_drag_bps: float
    leader_pnl: float
    depositor_net_pnl: float
    total_depositors: int
    depositors: list[VaultDepositor]
    share_price_history: list[SharePriceHistory]
    inception_date: str
    last_epoch: int
    last_updated: str


# ── Execution Schemas ─────────────────────────────────────────────────────────

class OrderRequest(BaseModel):
    asset: str
    is_buy: bool
    limit_px: float
    sz: float
    reduce_only: bool = False


class OrderResponse(BaseModel):
    status: str
    filled_sz: float
    avg_px: float
    message: str
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class BasisTradeRequest(BaseModel):
    spot_asset: str
    perp_asset: str
    spot_sz: float
    perp_sz: float
    spot_px: float
    perp_px: float
    max_slippage_bps: float = 5.0


class ExecutionStatus(BaseModel):
    spot_status: str
    perp_status: str
    details: str
    raw_payloads: list[dict[str, Any]] = Field(default_factory=list)


class CancelAllResponse(BaseModel):
    status: str
    message: str


class Position(BaseModel):
    asset: str
    net_delta: float
    spot_sz: float
    perp_sz: float
    funding_pnl: float
    margin_buffer: float


class SystemStatusResponse(BaseModel):
    agent_wallet: str
    master_wallet: str
    connection: str
    positions: list[Position] = Field(default_factory=list)
