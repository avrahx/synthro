import { BacktestResponse } from "./types";

export function exportBacktestJSON(data: BacktestResponse) {
  const exportData = {
    metadata: {
      name: "Synthro Delta-Neutral Funding Arbitrage",
      venue: "Hyperliquid L1",
      timestamp: new Date().toISOString(),
      parameters: data.request,
    },
    performance: {
      sharpe_ratio: data.summary.sharpe_ratio,
      sortino_ratio: data.summary.sortino_ratio,
      calmar_ratio: data.summary.calmar_ratio,
      max_drawdown_pct: data.summary.max_drawdown_pct,
      total_return_pct: data.summary.total_return_pct,
      win_rate_pct: data.summary.win_rate_pct,
      fee_drag_usd: data.summary.total_fees_usd,
    },
    time_series: data.equity_curve.map((p) => ({
      date: p.timestamp,
      equity: p.nav,
      cash: p.cash,
      spot_value: p.spot_value,
      perp_value: p.perp_value,
      cumulative_funding: p.cumulative_funding_received,
    })),
    trade_log: data.trades,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `synthro-report-hl-basis-${new Date().getFullYear()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
