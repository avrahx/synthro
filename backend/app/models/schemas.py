"""
HyperVault Alpha — Pydantic v2 Schemas

Domain models for backtest requests/responses, live funding snapshots,
vault simulation, and trade execution records.
"""

from __future__ import annotations

from typing import Literal, Optional
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
    initial_capital: float = Field(default=10_000.0, ge=1_000.0)
    taker_fee_bps: float = Field(default=3.5, ge=0.0, description="HL taker fee in bps")
    maker_fee_bps: float = Field(default=0.2, ge=0.0, description="HL maker rebate-adjusted bps")
    slippage_bps: float = Field(default=2.0, ge=0.0, description="Execution slippage bps")
    
    rebalance_freq_hours: int = Field(default=3, ge=1, description="Hours between forced rebalances")
    margin_borrow_apr: float = Field(default=0.05, ge=0.0, description="Annualized borrow cost for spot collateral")
    strategy_mode: Literal["INTRA_HL_CASH_AND_CARRY", "CROSS_VENUE_DISLOCATION", "VOLATILITY_ADJUSTED_HARVEST"] = Field(
        default="CROSS_VENUE_DISLOCATION"
    )
    max_leverage: float = Field(default=3.0, ge=1.0, le=20.0)
    
    vault_mode: bool = Field(default=True, description="Simulate as Hyperliquid User Vault")
    leader_stake_pct: float = Field(default=5.0, ge=5.0, le=100.0, description="Leader stake min 5%")
    hwm_fee_pct: float = Field(default=10.0, ge=0.0, le=50.0)


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
    
    # Cost Bridge Breakdown
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

class FundingRateRow(BaseModel):
    """Single asset funding comparison row."""
    symbol: str
    hl_funding_1h: float              # Hyperliquid 1-hour rate
    hl_funding_annualized_pct: float  # HL rate × 8760
    cex_funding_8h: float             # Aggregated CEX 8-hour rate
    cex_funding_annualized_pct: float # CEX rate × 1095
    spread_annualized_pct: float      # HL annualized − CEX annualized
    hl_mark_price: float
    hl_open_interest_usd: float
    signal: Literal["STRONG_LONG", "LONG", "NEUTRAL", "SHORT", "STRONG_SHORT"]


class FundingSnapshot(BaseModel):
    """Aggregated funding rate comparison across venues."""
    timestamp: str
    network: Literal["testnet", "mainnet"]
    rates: list[FundingRateRow]
    avg_hl_annualized_pct: float
    avg_cex_annualized_pct: float
    avg_spread_pct: float
    best_opportunity: Optional[FundingRateRow] = None


# ═══════════════════════════════════════════════════════════════════════════════
#  VAULT SIMULATION
# ═══════════════════════════════════════════════════════════════════════════════

class VaultDepositor(BaseModel):
    """Individual vault participant state."""
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
    """Hyperliquid-native User Vault KPIs."""
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
