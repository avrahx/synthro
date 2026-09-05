"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { LandingHero } from "../components/LandingHero";
import { BentoShowcase } from "../components/BentoShowcase";
import { MetricCards } from "../components/MetricCards";
import { LiveFundingMatrix } from "../components/LiveFundingMatrix";
import { BacktestSandbox } from "../components/BacktestSandbox";
import { EquityChart } from "../components/EquityChart";
import { CostBridge } from "../components/CostBridge";
import { VaultTearSheet } from "../components/VaultTearSheet";
import { ExecutionTerminal } from "../components/ExecutionTerminal";
import { ExportActions } from "../components/ExportActions";
import { StressTester } from "../components/StressTester";
import { RegimeInspector } from "../components/RegimeInspector";
import { TestnetDispatcher } from "../components/TestnetDispatcher";
import { OnChainAudit } from "../components/OnChainAudit";
import { ContractSpecViewer } from "../components/ContractSpecViewer";
import { WalletAudit } from "../components/WalletAudit";
import { useAccount } from "wagmi";
import { useDemoMode } from "../components/DemoContext";
import { BacktestRequest, BacktestResponse } from "../lib/types";
import { runBacktest, BASE_PATH } from "../lib/api";
import {
  TrendingUp,
  Percent,
  ShieldCheck,
  DollarSign,
  BarChart3,
  Sparkles,
  Vault,
  Terminal,
  Activity,
  BrainCircuit,
  Wallet,
} from "lucide-react";

type Tab = "live" | "portfolio" | "ml_regime" | "backtest" | "vault" | "execution" | "audit" | "stress";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("live");
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalRef = useRef<HTMLElement>(null);

  const { isConnected, address } = useAccount();
  const { isDemoMode } = useDemoMode();

  const handleLaunch = () => {
    setShowTerminal(true);
    // Slight delay to let state update render before scrolling
    setTimeout(() => {
      terminalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

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
      {/* ── Landing Hero ─────────────────────────────────────────────────── */}
      <LandingHero onLaunch={handleLaunch} />

      {/* ── Bento Feature Showcase ───────────────────────────────────────── */}
      <BentoShowcase />

      {/* ── Terminal Divider ─────────────────────────────────────────────── */}
      <div className="relative py-8 px-6 flex flex-col items-center gap-3 bg-[#06080D]">
        <div className="flex items-center gap-4 w-full max-w-6xl">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(13,242,164,0.3))" }} />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#0df2a4]/30 bg-[#0df2a4]/5">
            <div className="w-2 h-2 rounded-full bg-[#0df2a4] animate-pulse" />
            <span className="font-mono text-xs text-[#0df2a4] font-bold uppercase tracking-widest">
              {showTerminal ? "Terminal Active" : "Launch Terminal Below"}
            </span>
          </div>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(13,242,164,0.3), transparent)" }} />
        </div>
        {!showTerminal && (
          <button
            onClick={handleLaunch}
            className="font-mono text-xs text-gray-500 hover:text-[#0df2a4] transition-colors"
          >
            ↓ scroll or click to open the terminal
          </button>
        )}
      </div>

      {/* ── Quantitative Terminal ─────────────────────────────────────────── */}
      <motion.section
        ref={terminalRef}
        initial={false}
        animate={showTerminal ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ overflow: showTerminal ? "visible" : "hidden" }}
      >
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 space-y-6 grid-bg">
          {/* Banner */}
          <div
            className="glass rounded-2xl p-6 relative overflow-hidden bg-cover bg-center border border-synthro-border"
            style={{ backgroundImage: `url(${BASE_PATH}/assets/Banner_Wide.jpg)` }}
          >
            <div className="absolute inset-0 bg-synthro-bg/80 backdrop-blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-r from-synthro-cyan/10 via-transparent to-transparent" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-hl-cyan/15 border border-hl-cyan/40 text-hl-cyan font-mono text-xs font-semibold">
                    SYNTHRO // HYPERVAULT ALPHA
                  </span>
                </div>
                <h1 className="text-2xl font-mono font-black text-white tracking-tight">
                  Intra-L1 Basis Arbitrage &amp; 1H Funding Harvester
                </h1>
                <p className="text-xs text-gray-400 font-mono max-w-2xl">
                  Delta-neutral funding rate capture on Hyperliquid L1 with native User Vault
                  simulation, hourly settlement, and cross-venue basis spread monitoring.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-raised border border-border-subtle w-fit font-mono text-xs overflow-x-auto max-w-full">
              {([
                { id: "live" as Tab, label: "LIVE MARKET", icon: Sparkles },
                { id: "portfolio" as Tab, label: "PORTFOLIO AUDIT", icon: Wallet, badge: isConnected || isDemoMode },
                { id: "ml_regime" as Tab, label: "ML REGIME ENGINE", icon: BrainCircuit },
                { id: "backtest" as Tab, label: "BACKTEST ENGINE", icon: BarChart3 },
                { id: "vault" as Tab, label: "VAULT SIMULATOR", icon: Vault },
                { id: "execution" as Tab, label: "EXECUTION TERMINAL", icon: Terminal },
                { id: "audit" as Tab, label: "CRYPTOGRAPHIC AUDIT", icon: ShieldCheck },
                { id: "stress" as Tab, label: "STRESS TEST", icon: Activity },
              ]).map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-all whitespace-nowrap ${
                    tab === t.id
                      ? "bg-bg-elevated text-synthro-cyan font-bold border border-border-strong shadow-glow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                  {t.badge && tab !== t.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-synthro-mint animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {tab === "backtest" && <ExportActions data={result} />}
          </div>

          {/* Connected Wallet / Demo Mode Quick Action Banner */}
          {(isConnected || isDemoMode) && tab !== "portfolio" && (
            <div className="glass rounded-xl px-4 py-2.5 border border-synthro-cyan/30 bg-synthro-cyan/5 flex items-center justify-between font-mono text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="w-2 h-2 rounded-full bg-synthro-mint animate-pulse" />
                <span className="text-gray-400">
                  {isConnected ? "Wallet Connected:" : "Demo Mode Active:"}
                </span>
                <span className="text-white font-bold">
                  {isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Whale Portfolio (0xdf84...4261)"}
                </span>
                <span className="hidden lg:inline text-gray-500">— Real-time delta exposure, 1H funding carry, and liquidation health available.</span>
              </div>
              <button
                onClick={() => setTab("portfolio")}
                className="px-3 py-1 rounded bg-synthro-cyan/20 border border-synthro-cyan/40 text-synthro-cyan hover:bg-synthro-cyan/30 transition-all font-bold text-[11px] flex items-center gap-1 shrink-0"
              >
                <span>View Portfolio Audit</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* Live Market Tab */}
          {tab === "live" && <LiveFundingMatrix />}

          {/* Portfolio Audit Tab */}
          {tab === "portfolio" && <WalletAudit />}

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
                  <CostBridge metrics={m} />

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
          {tab === "execution" && (
            <div className="space-y-6">
              <TestnetDispatcher />
              <ExecutionTerminal />
            </div>
          )}

          {/* Audit Tab */}
          {tab === "audit" && (
            <div className="space-y-6">
              <OnChainAudit />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="glass rounded-xl p-6 border border-border-subtle h-[500px]">
                    <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide mb-4">
                      Solidity EVM Architecture
                    </h3>
                    <p className="text-gray-400 font-mono text-sm leading-relaxed mb-4">
                      The Synthro HyperVault utilizes a customized ERC-4626 implementation that anchors all state proofs on-chain.
                    </p>
                    <ul className="list-disc list-inside text-gray-500 font-mono text-xs space-y-2">
                      <li>Inherits OpenZeppelin ERC4626 standard.</li>
                      <li>Virtual shares decimal offset (inflation attack mitigation).</li>
                      <li>Strict High Water Mark (HWM) evaluation.</li>
                      <li>Asymmetric leader capacity requirements ({'>'} 5% equity).</li>
                    </ul>
                  </div>
                </div>
                <ContractSpecViewer />
              </div>
            </div>
          )}

          {/* Stress Tester Tab */}
          {tab === "stress" && <StressTester />}

          {/* ML Regime Engine Tab */}
          {tab === "ml_regime" && <RegimeInspector />}
        </main>
      </motion.section>
    </>
  );
}
