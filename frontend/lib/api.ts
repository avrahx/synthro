import {
  BacktestRequest,
  BacktestResponse,
  FundingSnapshot,
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
    const res = await fetch(`${API}/api/market/funding`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Funding fetch failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    const res = await fetch(`${BASE_PATH}/data/live_funding.json`);
    return res.json();
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
