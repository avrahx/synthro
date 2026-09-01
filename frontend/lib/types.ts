// ─── TypeScript interfaces mirroring backend Pydantic schemas ───────────────

export interface BacktestRequest {
  assets: string[];
  start_date: string;
  end_date: string;
  initial_capital: number;
  taker_fee_bps: number;
  maker_fee_bps: number;
  slippage_bps: number;
  rebalance_freq_hours: number;
  margin_borrow_apr: number;
  strategy_mode: "INTRA_HL_CASH_AND_CARRY" | "CROSS_VENUE_DISLOCATION" | "VOLATILITY_ADJUSTED_HARVEST";
  max_leverage: number;
  vault_mode: boolean;
  leader_stake_pct: number;
  hwm_fee_pct: number;
}

export interface TradeRecord {
  id: string;
  epoch: number;
  timestamp: string;
  asset: string;
  action: "OPEN_BASIS" | "CLOSE_BASIS" | "REBALANCE" | "FUNDING_SETTLE";
  side: "LONG_SPOT_SHORT_PERP" | "SHORT_SPOT_LONG_PERP" | "FLAT";
  notional_usd: number;
  mark_price: number;
  basis_bps: number;
  funding_rate_1h: number;
  fee_paid: number;
  pnl_realized: number;
}

export interface EquitySnapshot {
  epoch: number;
  timestamp: string;
  nav: number;
  cash: number;
  spot_value: number;
  perp_value: number;
  cumulative_funding_received: number;
  cumulative_fees_paid: number;
  cumulative_slippage_cost: number;
  gross_apr: number;
  net_apr: number;
  drawdown_pct: number;
  period_pnl: number;
  period_return_pct: number;
}

export interface SummaryMetrics {
  total_return_pct: number;
  cagr: number;
  annualized_return_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  max_drawdown_pct: number;
  longest_underwater_hours: number;
  ulcer_index: number;
  omega_ratio: number;
  
  win_rate_pct: number;
  profit_factor: number;
  total_trades: number;
  
  gross_yield_usd: number;
  total_funding_usd: number;
  total_fees_usd: number;
  total_slippage_usd: number;
  margin_borrow_cost_usd: number;
  net_profit_usd: number;
  
  final_nav: number;
  initial_capital: number;
}

export interface AssetAttribution {
  asset: string;
  allocated_notional: number;
  funding_earned: number;
  basis_pnl: number;
  fees_paid: number;
  net_pnl: number;
  trade_count: number;
}

export interface BacktestResponse {
  request: BacktestRequest;
  summary: SummaryMetrics;
  equity_curve: EquitySnapshot[];
  trades: TradeRecord[];
  attribution: AssetAttribution[];
}

export interface FundingRateRow {
  symbol: string;
  hl_funding_1h: number;
  hl_funding_annualized_pct: number;
  cex_funding_8h: number;
  cex_funding_annualized_pct: number;
  spread_annualized_pct: number;
  hl_mark_price: number;
  hl_open_interest_usd: number;
  signal: "STRONG_LONG" | "LONG" | "NEUTRAL" | "SHORT" | "STRONG_SHORT";
}

export interface FundingSnapshot {
  timestamp: string;
  network: "testnet" | "mainnet";
  rates: FundingRateRow[];
  avg_hl_annualized_pct: number;
  avg_cex_annualized_pct: number;
  avg_spread_pct: number;
  best_opportunity: FundingRateRow | null;
}

export interface VaultDepositor {
  address: string;
  deposit_usd: number;
  shares: number;
  current_value_usd: number;
  pnl_usd: number;
  pnl_pct: number;
}

export interface SharePriceHistory {
  timestamp: string;
  share_price: number;
  hwm: number;
}

export interface VaultStats {
  vault_name: string;
  leader_address: string;
  total_deposits_usd: number;
  total_nav_usd: number;
  share_price: number;
  high_water_mark: number;
  leader_stake_usd: number;
  leader_stake_pct: number;
  hwm_fee_pct: number;
  accrued_performance_fee_usd: number;
  fee_drag_bps: number;
  leader_pnl: number;
  depositor_net_pnl: number;
  total_depositors: number;
  depositors: VaultDepositor[];
  share_price_history: SharePriceHistory[];
  inception_date: string;
  last_epoch: number;
  last_updated: string;
}
