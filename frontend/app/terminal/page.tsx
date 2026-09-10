"use client";

import React, { useState, useEffect } from "react";
import { MetricCards }        from "../../components/MetricCards";
import { LiveFundingMatrix }  from "../../components/LiveFundingMatrix";
import { BacktestSandbox }    from "../../components/BacktestSandbox";
import { EquityChart }        from "../../components/EquityChart";
import { CostBridge }         from "../../components/CostBridge";
import { VaultTearSheet }     from "../../components/VaultTearSheet";
import { ExecutionTerminal }  from "../../components/ExecutionTerminal";
import { ExportActions }      from "../../components/ExportActions";
import { StressTester }       from "../../components/StressTester";
import { RegimeInspector }    from "../../components/RegimeInspector";
import { TestnetDispatcher }  from "../../components/TestnetDispatcher";
import { OnChainAudit }       from "../../components/OnChainAudit";
import { ContractSpecViewer } from "../../components/ContractSpecViewer";
import { WalletAudit }        from "../../components/WalletAudit";
import { useAccount }         from "wagmi";
import { useDemoMode }        from "../../components/DemoContext";
import { BacktestRequest, BacktestResponse } from "../../lib/types";
import { runBacktest, BASE_PATH } from "../../lib/api";
import Link from "next/link";
import {
  TrendingUp, Percent, ShieldCheck, DollarSign, BarChart3,
  Sparkles, Vault, Terminal, Activity, BrainCircuit, Wallet,
  ArrowLeft, Wifi, WifiOff, ChevronRight,
} from "lucide-react";

// ── Tab Definition ─────────────────────────────────────────────────────────
type Tab =
  | "live" | "portfolio" | "ml_regime" | "backtest"
  | "vault" | "execution" | "audit" | "stress";

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ElementType;
  section: "market" | "analysis" | "execution" | "risk";
}

const TABS: TabDef[] = [
  // Market
  { id: "live",      label: "Live Market",       icon: Sparkles,    section: "market" },
  { id: "portfolio", label: "Portfolio Audit",    icon: Wallet,      section: "market" },
  // Analysis
  { id: "ml_regime", label: "ML Regime Engine",  icon: BrainCircuit,section: "analysis" },
  { id: "backtest",  label: "Backtest Engine",    icon: BarChart3,   section: "analysis" },
  { id: "vault",     label: "Vault Simulator",   icon: Vault,       section: "analysis" },
  // Execution
  { id: "execution", label: "Execution Terminal", icon: Terminal,    section: "execution" },
  // Risk
  { id: "audit",     label: "Cryptographic Audit",icon: ShieldCheck, section: "risk" },
  { id: "stress",    label: "Stress Test",        icon: Activity,    section: "risk" },
];

const SECTIONS: { id: string; label: string; index: string }[] = [
  { id: "market",    label: "Market Data",   index: "001" },
  { id: "analysis",  label: "Quantitative",  index: "002" },
  { id: "execution", label: "Execution",     index: "003" },
  { id: "risk",      label: "Risk & Audit",  index: "004" },
];

// ── Default Backtest Params ────────────────────────────────────────────────
const DEFAULT_BT_REQ: BacktestRequest = {
  assets: ["BTC", "ETH", "SOL", "AVAX"],
  start_date: "2024-06-01",
  end_date: "2025-01-01",
  initial_capital: 100_000,
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
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(v: number, prefix = "$", dec = 0) {
  const n = Math.abs(v);
  const s = n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` :
            n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` :
            n.toFixed(dec);
  return `${v < 0 ? "-" : ""}${prefix}${s}`;
}

function sign(v: number, suffix = "") {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}${suffix}`;
}

// ── Page Component ─────────────────────────────────────────────────────────
export default function TerminalPage() {
  const [tab, setTab]       = useState<Tab>("live");
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const { isDemoMode } = useDemoMode();

  const handleRun = async (req: BacktestRequest) => {
    setIsRunning(true);
    setError(null);
    try   { setResult(await runBacktest(req)); }
    catch (e: any) { setError(e.message || "Backtest failed"); }
    finally { setIsRunning(false); }
  };

  // Auto-run backtest on first visit to that tab
  useEffect(() => {
    if (tab === "backtest" && !result && !isRunning) {
      handleRun(DEFAULT_BT_REQ);
    }
  }, [tab]);

  const m = result?.summary;

  return (
    <div className="workstation-layout">

      {/* ══ LEFT SIDEBAR — Navigation ═══════════════════════════════════════ */}
      <aside className="workstation-sidebar">
        {/* Logo block */}
        <div className="mb-5 px-1">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src={`${BASE_PATH}/assets/Logo_Wide.jpg`}
              alt="Synthro"
              className="h-7 object-contain rounded"
            />
          </Link>
          <div className="flex items-center gap-2 mt-3">
            <Link
              href="/"
              className="flex items-center gap-1 text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Home
            </Link>
          </div>
        </div>

        {/* Tab groups */}
        {SECTIONS.map((sec) => {
          const sectionTabs = TABS.filter((t) => t.section === sec.id);
          return (
            <div key={sec.id}>
              <div className="sidebar-section-label">
                <span style={{ opacity: 0.5, marginRight: "6px" }}>{sec.index} //</span>
                {sec.label}
              </div>
              {sectionTabs.map((t) => (
                <button
                  key={t.id}
                  className={`sidebar-item w-full text-left ${tab === t.id ? "active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  <t.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.label}</span>
                  {tab === t.id && (
                    <ChevronRight className="w-3 h-3 ml-auto shrink-0 text-[var(--mint)]" />
                  )}
                  {/* Connected badge on Portfolio */}
                  {t.id === "portfolio" && (isConnected || isDemoMode) && tab !== "portfolio" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] animate-pulse ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          );
        })}

        {/* Bottom: network status */}
        <div className="mt-auto pt-6 border-t border-[rgba(255,255,255,0.05)] space-y-2">
          <div className="kpi-label">Network Status</div>
          <div className="status-pill online">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] animate-ping-slow" />
            HL L1 · Testnet
          </div>
          {(isConnected && address) && (
            <div className="status-pill online mt-2" style={{ fontSize: "9px" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" />
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </div>
          )}
          {isDemoMode && !isConnected && (
            <div className="status-pill warn mt-2" style={{ fontSize: "9px" }}>
              <Sparkles className="w-3 h-3" />
              Demo Mode
            </div>
          )}
        </div>
      </aside>

      {/* ══ CENTER MAIN — Content Canvas ══════════════════════════════════════ */}
      <main className="workstation-main">

        {/* ── Page title bar ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="protocol-label">
                {SECTIONS.find((s) => TABS.find((t) => t.id === tab)?.section === s.id)?.index ?? "000"}
                {" // "}
                {TABS.find((t) => t.id === tab)?.label?.toUpperCase() ?? "TERMINAL"}
              </span>
            </div>
            <h1 className="text-lg font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
              {TABS.find((t) => t.id === tab)?.label ?? "Terminal"}
            </h1>
            <p className="text-[11px] font-mono text-gray-600 mt-0.5">
              Synthro HyperVault Alpha · Hyperliquid L1 Basis Engine
            </p>
          </div>
          {tab === "backtest" && <ExportActions data={result} />}
        </div>

        {/* ── Wallet / Demo banner ─────────────────────────────────────────── */}
        {(isConnected || isDemoMode) && tab !== "portfolio" && (
          <div
            className="mb-6 flex items-center justify-between px-4 py-2.5 rounded-xl border font-mono text-xs animate-fade-in-up"
            style={{
              background: "rgba(13,242,164,0.04)",
              borderColor: "rgba(13,242,164,0.2)",
            }}
          >
            <div className="flex items-center gap-2 text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] animate-pulse" />
              {isConnected && address
                ? <><span className="text-white font-bold">{address?.slice(0, 6)}…{address?.slice(-4)}</span><span className="hidden lg:inline ml-1">— Real-time HL clearinghouse data available.</span></>
                : <><span className="text-[var(--mint)] font-bold">Demo Mode</span><span className="hidden lg:inline ml-1">— Simulated whale portfolio loaded.</span></>
              }
            </div>
            <button
              onClick={() => setTab("portfolio")}
              className="btn-protocol-ghost shrink-0"
            >
              View Audit →
            </button>
          </div>
        )}

        {/* ── Tab Panels ───────────────────────────────────────────────────── */}

        {tab === "live"      && <LiveFundingMatrix />}
        {tab === "portfolio" && <WalletAudit />}
        {tab === "ml_regime" && <RegimeInspector />}
        {tab === "stress"    && <StressTester />}
        {tab === "vault"     && <VaultTearSheet />}

        {tab === "execution" && (
          <div className="space-y-6">
            <TestnetDispatcher />
            <ExecutionTerminal />
          </div>
        )}

        {tab === "audit" && (
          <div className="space-y-6">
            <OnChainAudit />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 border border-[rgba(255,255,255,0.06)] h-[480px]">
                <h3 className="font-mono text-xs font-bold text-white uppercase tracking-widest mb-4">
                  ERC-4626 Architecture
                </h3>
                <p className="text-gray-400 font-mono text-xs leading-relaxed mb-4">
                  The Synthro HyperVault uses a customized ERC-4626 implementation that
                  anchors all state proofs on-chain via keccak256 Merkle roots.
                </p>
                <ul className="space-y-2 text-gray-500 font-mono text-[11px]">
                  {[
                    "Inherits OpenZeppelin ERC4626 standard",
                    "Virtual shares decimal offset (inflation attack mitigation)",
                    "Strict High Water Mark (HWM) evaluation per epoch",
                    "Asymmetric leader capacity (≥ 5% equity)",
                    "On-chain Merkle proof of epoch state at settlement",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[var(--mint)] mt-0.5">›</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <ContractSpecViewer />
            </div>
          </div>
        )}

        {tab === "backtest" && (
          <div className="space-y-6">
            <BacktestSandbox onRun={handleRun} isRunning={isRunning} />

            {error && (
              <div className="p-4 rounded-xl border font-mono text-xs"
                style={{ background: "rgba(244,63,94,0.08)", borderColor: "rgba(244,63,94,0.3)", color: "#f43f5e" }}>
                ⚠ {error}
              </div>
            )}

            {result && m && (
              <>
                <MetricCards
                  metrics={[
                    {
                      label: "Net Return",
                      value: `${m.total_return_pct >= 0 ? "+" : ""}${m.total_return_pct.toFixed(2)}%`,
                      sub: fmt(m.net_profit_usd),
                      delta: `${sign(m.annualized_return_pct, "% CAGR")}`,
                      deltaType: m.total_return_pct >= 0 ? "positive" : "negative",
                      icon: TrendingUp,
                      badge: `NAV ${fmt(m.final_nav)}`,
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
                      value: fmt(m.total_funding_usd),
                      sub: `Fees: -${fmt(m.total_fees_usd)}`,
                      delta: `${m.total_trades} Trades`,
                      deltaType: "positive",
                      icon: DollarSign,
                      badge: `Win ${m.win_rate_pct.toFixed(0)}%`,
                    },
                  ]}
                />
                <EquityChart curve={result.equity_curve} metrics={m} />
                <CostBridge metrics={m} />

                {/* Attribution Grid */}
                <div className="card-protocol p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <h3 className="font-mono text-xs font-bold text-white uppercase tracking-widest">
                      Asset PnL Attribution
                    </h3>
                    <div className="flex-1 h-px" style={{ background: "var(--border-dim)" }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                    {result.attribution.map((a) => (
                      <div
                        key={a.asset}
                        className="card-protocol p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between pb-2"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className="font-bold text-white text-sm">{a.asset}</span>
                          <span className="metric-badge neutral">{a.trade_count} trades</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Funding</span>
                          <span className="text-[var(--mint)] font-semibold">
                            +{fmt(a.funding_earned)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Basis PnL</span>
                          <span className="text-gray-300">{fmt(a.basis_pnl)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Fees</span>
                          <span className="text-[var(--coral)]">-{fmt(a.fees_paid)}</span>
                        </div>
                        <div className="flex justify-between pt-2"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                          <span className="text-gray-600">Net</span>
                          <span className={`font-bold ${a.net_pnl >= 0 ? "text-[var(--cyan)]" : "text-[var(--coral)]"}`}>
                            {a.net_pnl >= 0 ? "+" : ""}{fmt(a.net_pnl)}
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
      </main>

      {/* ══ RIGHT PANEL — Context KPIs ══════════════════════════════════════════ */}
      <aside className="workstation-panel">
        <div className="kpi-label mb-4">Strategy Overview</div>

        {/* Strategy KPIs */}
        {m ? (
          <>
            <div className="kpi-row">
              <div className="kpi-label">Net Profit</div>
              <div className={`kpi-value ${m.net_profit_usd >= 0 ? "text-[var(--mint)]" : "text-[var(--coral)]"}`}>
                {fmt(m.net_profit_usd)}
              </div>
              <div className="text-[10px] font-mono text-gray-600 mt-1">
                {sign(m.total_return_pct, "% total")}
              </div>
            </div>

            <div className="kpi-row">
              <div className="kpi-label">Sharpe / Sortino</div>
              <div className="kpi-value text-[var(--cyan)]">
                {m.sharpe_ratio.toFixed(2)}
              </div>
              <div className="text-[10px] font-mono text-gray-600 mt-1">
                Sortino {m.sortino_ratio.toFixed(2)}
              </div>
            </div>

            <div className="kpi-row">
              <div className="kpi-label">Max Drawdown</div>
              <div className="kpi-value text-[var(--coral)]">
                -{m.max_drawdown_pct.toFixed(2)}%
              </div>
              <div className="text-[10px] font-mono text-gray-600 mt-1">
                Calmar {m.calmar_ratio.toFixed(2)}  ·  Ulcer {m.ulcer_index.toFixed(2)}
              </div>
            </div>

            <div className="kpi-row">
              <div className="kpi-label">Win Rate</div>
              <div className="kpi-value text-white">
                {m.win_rate_pct.toFixed(1)}%
              </div>
              <div className="text-[10px] font-mono text-gray-600 mt-1">
                {m.total_trades} total trades
              </div>
            </div>

            <div className="kpi-row">
              <div className="kpi-label">Funding Harvested</div>
              <div className="kpi-value text-[var(--mint)]">
                {fmt(m.total_funding_usd)}
              </div>
            </div>

            <div className="kpi-row">
              <div className="kpi-label">Total Fees</div>
              <div className="kpi-value text-[var(--coral)]">
                -{fmt(m.total_fees_usd)}
              </div>
            </div>

            <div className="kpi-row">
              <div className="kpi-label">Final NAV</div>
              <div className="kpi-value text-white">
                {fmt(m.final_nav)}
              </div>
            </div>
          </>
        ) : (
          // Skeleton when no backtest run yet
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="kpi-row">
                <div className="kpi-label">{"—"}</div>
                <div className="h-6 w-24 rounded shimmer mt-1" />
              </div>
            ))}
            <p className="text-[10px] font-mono text-gray-700 mt-4">
              Run the Backtest Engine to populate live KPIs.
            </p>
          </>
        )}

        {/* ── Quick Links ─────────────────────────────────────────────────── */}
        <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="kpi-label mb-3">Quick Actions</div>
          {(["backtest", "stress", "audit"] as Tab[]).map((t) => {
            const def = TABS.find((x) => x.id === t)!;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`w-full flex items-center gap-2 px-3 py-2 mb-1 text-[11px] font-mono font-semibold transition-all ${
                  tab === t
                    ? "text-[var(--mint)] border border-[rgba(13,242,164,0.2)] bg-[rgba(13,242,164,0.06)]"
                    : "text-gray-500 hover:text-gray-300 hover:bg-[rgba(255,255,255,0.03)] border border-transparent"
                }`}
                style={{ borderRadius: "4px" }}
              >
                <def.icon className="w-3.5 h-3.5 shrink-0" />
                {def.label}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
