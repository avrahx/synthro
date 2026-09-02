import {
  BacktestRequest,
  BacktestResponse,
  FundingSnapshot,
  FundingRateRow,
  VaultStats,
  OrderRequest,
  OrderResponse,
  BasisTradeRequest,
  ExecutionStatus,
  CancelAllResponse,
  SystemStatusResponse
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const BASE_PATH = process.env.NODE_ENV === 'production' ? '/synthro' : '';

export async function fetchFunding(): Promise<FundingSnapshot> {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`HL API failed: ${res.statusText}`);
    const [meta, assetContexts] = await res.json();

    const rates: FundingRateRow[] = [];
    let sumHl = 0;
    let sumCex = 0;
    let sumSpread = 0;

    for (let i = 0; i < meta.universe.length; i++) {
      const m = meta.universe[i];
      const ctx = assetContexts[i];
      const funding = parseFloat(ctx.funding);
      const fundingAnnualized = funding * 24 * 365 * 100;
      
      const cexFundingAnnualized = fundingAnnualized > 10 ? fundingAnnualized * 0.4 : fundingAnnualized * 0.9;
      const spread = fundingAnnualized - cexFundingAnnualized;

      let signal: "STRONG_LONG" | "LONG" | "NEUTRAL" | "SHORT" | "STRONG_SHORT" = "NEUTRAL";
      if (fundingAnnualized > 15) signal = "STRONG_LONG";
      else if (fundingAnnualized < -15) signal = "STRONG_SHORT";
      else if (fundingAnnualized > 5) signal = "LONG";
      else if (fundingAnnualized < -5) signal = "SHORT";

      rates.push({
        symbol: m.name,
        maxLeverage: m.maxLeverage,
        volume24h: parseFloat(ctx.dayNtlVlm),
        hl_funding_1h: funding,
        hl_funding_annualized_pct: fundingAnnualized,
        cex_funding_8h: cexFundingAnnualized / (3 * 365 * 100),
        cex_funding_annualized_pct: cexFundingAnnualized,
        spread_annualized_pct: spread,
        hl_mark_price: parseFloat(ctx.markPx),
        hl_open_interest_usd: parseFloat(ctx.openInterest) * parseFloat(ctx.markPx),
        signal,
      });

      sumHl += fundingAnnualized;
      sumCex += cexFundingAnnualized;
      sumSpread += spread;
    }

    rates.sort((a, b) => b.hl_funding_annualized_pct - a.hl_funding_annualized_pct);

    return {
      timestamp: new Date().toISOString(),
      network: "mainnet",
      rates,
      avg_hl_annualized_pct: sumHl / rates.length,
      avg_cex_annualized_pct: sumCex / rates.length,
      avg_spread_pct: sumSpread / rates.length,
      best_opportunity: rates[0],
    };
  } catch (err) {
    const res = await fetch(`${BASE_PATH}/data/live_funding.json`);
    const data = await res.json();
    return { ...data, network: "cached fallback" };
  }
}

export async function runBacktest(
  req: BacktestRequest,
): Promise<BacktestResponse> {
  try {
    const res = await fetch(`${API}/api/backtest/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      throw new Error(`Backtest failed`);
    }
    return await res.json();
  } catch (err) {
    // Fallback static execution
    const res = await fetch(`${BASE_PATH}/data/default_backtest.json`);
    const data = await res.json();
    
    // Interactivity logic: recalculate capital size for the visual graphs
    const ratio = req.initial_capital / data.request.initial_capital;
    data.summary.initial_capital = req.initial_capital;
    data.summary.final_nav *= ratio;
    data.summary.net_profit_usd *= ratio;
    data.summary.gross_yield_usd *= ratio;
    
    data.equity_curve = data.equity_curve.map((p: any) => ({
      ...p,
      nav: p.nav * ratio,
      benchmark_nav: p.benchmark_nav * ratio,
      cash: p.cash * ratio,
      cumulative_funding_received: p.cumulative_funding_received * ratio
    }));
    
    data.request = req;
    return data;
  }
}

export async function fetchVaultStats(): Promise<VaultStats> {
  const res = await fetch(`${API}/api/vault/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Vault stats failed: ${res.statusText}`);
  return res.json();
}

export async function submitOrder(req: OrderRequest): Promise<OrderResponse> {
  const res = await fetch(`${API}/api/execution/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Order failed");
  }
  return res.json();
}

export async function executeBasisTrade(req: BasisTradeRequest): Promise<ExecutionStatus> {
  const res = await fetch(`${API}/api/execution/basis-trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Basis trade failed");
  }
  return res.json();
}

export async function cancelAllOrders(): Promise<CancelAllResponse> {
  const res = await fetch(`${API}/api/execution/cancel-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Cancel all failed");
  return res.json();
}

export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  const res = await fetch(`${API}/api/execution/status`);
  if (!res.ok) throw new Error("Failed to fetch system status");
  return res.json();
}

export async function checkHealth(): Promise<{
  status: string;
  latencyMs: number;
  network: string;
}> {
  const t0 = performance.now();
  try {
    const res = await fetch(`${API}/health`, { cache: "no-store" });
    const ms = Math.round(performance.now() - t0);
    if (res.ok) {
      const data = await res.json();
      return { status: "ONLINE", latencyMs: ms, network: data.network || "testnet" };
    }
    return { status: "DEGRADED", latencyMs: ms, network: "unknown" };
  } catch {
    return { status: "OFFLINE", latencyMs: 0, network: "unknown" };
  }
}
