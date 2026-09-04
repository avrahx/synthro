export interface StressParams {
  portfolio_capital: number;
  leverage_ratio: number;
  spot_price_shock_pct: number; // e.g. -0.5 for -50%
  basis_divergence_bps: number; // e.g. -400 for -400 bps
  maintenance_margin_req: number; // e.g. 0.05
}

export interface StressResult {
  spot_unrealized_pnl: number;
  perp_unrealized_pnl: number;
  net_unrealized_pnl: number;
  margin_balance: number;
  maintenance_margin: number;
  health_factor: number;
  health_status: "SAFE" | "WARNING" | "LIQUIDATION";
  liquidation_distance_pct: number;
  auto_rebalance_usd: number;
}

export function calculateStressState(params: StressParams): StressResult {
  const {
    portfolio_capital,
    leverage_ratio,
    spot_price_shock_pct,
    basis_divergence_bps,
    maintenance_margin_req,
  } = params;

  // Assuming initial margin is just the total capital allocated to the perp leg.
  // In a delta-neutral setup at 1x leverage, spot leg = 1x cap, perp short = 1x cap. Margin = cap.
  const spot_notional = portfolio_capital * leverage_ratio;
  const perp_notional = portfolio_capital * leverage_ratio;
  const initial_margin = portfolio_capital; // The total cash backing the short

  const basis_divergence = basis_divergence_bps / 10000;

  // Calculate new values based on shocks
  const spot_unrealized_pnl = spot_notional * spot_price_shock_pct;
  const perp_unrealized_pnl = -perp_notional * (spot_price_shock_pct + basis_divergence);
  
  const net_unrealized_pnl = spot_unrealized_pnl + perp_unrealized_pnl;

  const margin_balance = initial_margin + perp_unrealized_pnl;
  const maintenance_margin = perp_notional * (1 + spot_price_shock_pct) * maintenance_margin_req;

  let health_factor = 999;
  if (maintenance_margin > 0) {
    health_factor = margin_balance / maintenance_margin;
  }

  let health_status: "SAFE" | "WARNING" | "LIQUIDATION" = "SAFE";
  if (health_factor <= 1.0) {
    health_status = "LIQUIDATION";
  } else if (health_factor <= 2.0) {
    health_status = "WARNING";
  }

  // Liquidation Price Math
  // Liq happens when MarginBalance(S) = MMR(S)
  // InitMargin - PerpNotional * (S + B) = PerpNotional * (1 + S) * MMR_req
  // S_liq = ( (InitMargin / PerpNotional) - B - MMR_req ) / (1 + MMR_req)
  const marginRatio = initial_margin / perp_notional;
  const s_liq = (marginRatio - basis_divergence - maintenance_margin_req) / (1 + maintenance_margin_req);
  
  const current_price_ratio = 1 + spot_price_shock_pct;
  const liq_price_ratio = 1 + s_liq;
  
  let liquidation_distance_pct = 0;
  if (current_price_ratio > 0) {
    liquidation_distance_pct = ((liq_price_ratio - current_price_ratio) / current_price_ratio) * 100;
  }

  // Auto-Rebalance Math
  // Find amount of spot X to sell into USDC margin to push Health Factor >= 2.5
  let auto_rebalance_usd = 0;
  if (health_factor < 2.5 && margin_balance > 0 && current_price_ratio > 0) {
    const target_margin = 2.5 * maintenance_margin;
    auto_rebalance_usd = target_margin - margin_balance;
    if (auto_rebalance_usd < 0) auto_rebalance_usd = 0;
    
    // Cap at actual spot value
    const current_spot_value = spot_notional + spot_unrealized_pnl;
    if (auto_rebalance_usd > current_spot_value) {
      auto_rebalance_usd = current_spot_value;
    }
  }

  return {
    spot_unrealized_pnl,
    perp_unrealized_pnl,
    net_unrealized_pnl,
    margin_balance,
    maintenance_margin,
    health_factor,
    health_status,
    liquidation_distance_pct,
    auto_rebalance_usd,
  };
}
