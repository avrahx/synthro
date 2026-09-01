"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { MetricCards } from "../components/MetricCards";
import { LiveFundingMatrix } from "../components/LiveFundingMatrix";
import { BacktestSandbox } from "../components/BacktestSandbox";
import { EquityChart } from "../components/EquityChart";
import { VaultTearSheet } from "../components/VaultTearSheet";
import { ExecutionTerminal } from "../components/ExecutionTerminal";
import { BacktestRequest, BacktestResponse } from "../lib/types";
import { runBacktest } from "../lib/api";
import {
  TrendingUp,
  Percent,
  ShieldCheck,
  DollarSign,
  BarChart3,
  Sparkles,
  Vault,
  Terminal,
} from "lucide-react";

type Tab = "live" | "backtest" | "vault" | "execution";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("live");
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-run default backtest on first visit to backtest tab
  const handleRun = async (req: BacktestRequest) => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await runBacktest(req);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Backtest failed");
    }
    setIsRunning(false);
  };

  useEffect(() => {
    if (tab === "backtest" && !result) {
      handleRun({
        assets: ["BTC", "ETH", "SOL", "AVAX"],
        start_date: "2024-06-01",
        end_date: "2025-01-01",
        initial_capital: 100000,
        taker_fee_bps: 3.5,
        maker_fee_bps: 0.2,
        slippage_bps: 2.0,
        rebalance_freq_hours: 3,
        margin_borrow_apr: 0.05,
        strategy_mode: "CROSS_VENUE_DISLOCATION",
        max_leverage: 3.0,
        vault_mode: true,
        leader_stake_pct: 5.0,
        hwm_fee_pct: 10.0,
      });
    }
  }, [tab]);

  const m = result?.summary;

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 space-y-6 grid-bg">
        {/* Banner */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-hl-cyan/5 via-hl-blue/5 to-hl-violet/5" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-hl-cyan/15 border border-hl-cyan/40 text-hl-cyan font-mono text-xs font-semibold">
                  SYNTHRO // HYPERVAULT ALPHA
                </span>
              </div>
              <h1 className="text-2xl font-mono font-black text-white tracking-tight">
                Intra-L1 Basis Arbitrage & 1H Funding Harvester
              </h1>
              <p className="text-xs text-gray-400 font-mono max-w-2xl">
                Delta-neutral funding rate capture on Hyperliquid L1 with native User Vault
                simulation, hourly settlement, and cross-venue basis spread monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-raised border border-border-subtle w-fit font-mono text-xs">
          {([
            { id: "live" as Tab, label: "LIVE MARKET", icon: Sparkles },
            { id: "backtest" as Tab, label: "BACKTEST ENGINE", icon: BarChart3 },
            { id: "vault" as Tab, label: "VAULT SIMULATOR", icon: Vault },
            { id: "execution" as Tab, label: "EXECUTION TERMINAL", icon: Terminal },
          ]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md transition-all ${
                tab === t.id
                  ? "bg-bg-elevated text-hl-cyan font-bold border border-border-strong shadow-glow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Live Market Tab */}
        {tab === "live" && <LiveFundingMatrix />}

        {/* Backtest Tab */}
        {tab === "backtest" && (
          <div className="space-y-6">
            <BacktestSandbox onRun={handleRun} isRunning={isRunning} />

            {error && (
              <div className="p-4 rounded-lg bg-hl-rose/10 border border-hl-rose/30 text-hl-rose font-mono text-xs">
                ⚠️ {error}
              </div>
            )}

            {result && m && (
              <>
                <MetricCards
                  metrics={[
                    {
                      label: "Net Return",
                      value: `${m.total_return_pct >= 0 ? "+" : ""}${m.total_return_pct.toFixed(2)}%`,
                      sub: `$${m.net_profit_usd.toLocaleString()}`,
                      delta: `${m.annualized_return_pct.toFixed(1)}% Annualized`,
                      deltaType: m.total_return_pct >= 0 ? "positive" : "negative",
                      icon: TrendingUp,
                      badge: `NAV $${m.final_nav.toLocaleString()}`,
                    },
                    {
                      label: "Sharpe Ratio",
                      value: m.sharpe_ratio.toFixed(2),
                      sub: `Sortino: ${m.sortino_ratio.toFixed(2)}`,
                      delta: "Risk-Adjusted Alpha",
                      deltaType: "positive",
                      icon: ShieldCheck,
                      badge: "ANNUALIZED",
                    },
                    {
                      label: "Max Drawdown",
                      value: `-${m.max_drawdown_pct.toFixed(2)}%`,
                      sub: `Calmar: ${m.calmar_ratio.toFixed(2)}`,
                      delta: "Delta-Hedged Risk",
                      deltaType: m.max_drawdown_pct < 5 ? "positive" : "negative",
                      icon: Percent,
                      badge: "CONTROLLED",
                    },
                    {
                      label: "Funding Harvested",
                      value: `$${m.total_funding_usd.toLocaleString()}`,
                      sub: `Fees: -$${m.total_fees_usd.toLocaleString()}`,
                      delta: `${m.total_trades} Trades`,
                      deltaType: "positive",
                      icon: DollarSign,
                      badge: `Win ${m.win_rate_pct.toFixed(0)}%`,
                    },
                  ]}
                />

                <EquityChart curve={result.equity_curve} metrics={m} />

                {/* Attribution */}
                <div className="glass rounded-xl p-5">
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide mb-4">
                    Asset PnL Attribution
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                    {result.attribution.map((a) => (
                      <div key={a.asset} className="p-4 rounded-lg bg-bg-elevated border border-border-subtle space-y-2 hover:border-hl-cyan/30 transition-all">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                          <span className="font-bold text-white text-sm">{a.asset}</span>
                          <span className="px-2 py-0.5 rounded bg-bg text-[10px] text-gray-500">{a.trade_count} trades</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Funding:</span>
                          <span className="text-hl-green font-semibold">+${a.funding_earned.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Basis PnL:</span>
                          <span className="text-gray-200">${a.basis_pnl.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Fees:</span>
                          <span className="text-hl-rose">-${a.fees_paid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-400 pt-1 border-t border-border-subtle/50">
                          <span>Net:</span>
                          <span className={`font-bold ${a.net_pnl >= 0 ? "text-hl-cyan" : "text-hl-rose"}`}>
                            {a.net_pnl >= 0 ? "+" : ""}${a.net_pnl.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Vault Tab */}
        {tab === "vault" && <VaultTearSheet />}
        
        {/* Execution Tab */}
        {tab === "execution" && <ExecutionTerminal />}
      </main>
    </>
  );
}
