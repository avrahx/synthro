import {
  BacktestRequest,
  BacktestResponse,
  FundingSnapshot,
  VaultStats,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchFunding(): Promise<FundingSnapshot> {
  const res = await fetch(`${API}/api/market/funding`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Funding fetch failed: ${res.statusText}`);
  return res.json();
}

export async function runBacktest(
  req: BacktestRequest,
): Promise<BacktestResponse> {
  const res = await fetch(`${API}/api/backtest/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Backtest failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchVaultStats(): Promise<VaultStats> {
  const res = await fetch(`${API}/api/vault/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Vault stats failed: ${res.statusText}`);
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
