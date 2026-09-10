"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Percent,
  ShieldCheck,
  DollarSign,
  BarChart3,
  Vault,
  Terminal,
  Activity,
  BrainCircuit,
  Wallet,
  ArrowLeft,
  ChevronRight,
  Info,
  Sliders,
  Maximize2,
  Clock,
  Layers,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useDemoMode } from "../../components/DemoContext";
import { BacktestRequest, BacktestResponse } from "../../lib/types";
import { runBacktest, BASE_PATH } from "../../lib/api";
import { calculateStressState } from "../../lib/stressTest";

// Components
import { MetricCards } from "../../components/MetricCards";
import { LiveFundingMatrix } from "../../components/LiveFundingMatrix";
import { BacktestSandbox } from "../../components/BacktestSandbox";
import { EquityChart } from "../../components/EquityChart";
import { CostBridge } from "../../components/CostBridge";
import { VaultTearSheet } from "../../components/VaultTearSheet";
import { ExecutionTerminal } from "../../components/ExecutionTerminal";
import { ExportActions } from "../../components/ExportActions";
import { StressTester } from "../../components/StressTester";
import { RegimeInspector } from "../../components/RegimeInspector";
import { TestnetDispatcher } from "../../components/TestnetDispatcher";
import { OnChainAudit } from "../../components/OnChainAudit";
import { ContractSpecViewer } from "../../components/ContractSpecViewer";
import { WalletAudit } from "../../components/WalletAudit";
import { BasisExecutionDock } from "../../components/BasisExecutionDock";
import { BasisExecutionModal } from "../../components/BasisExecutionModal";

// ── Dynamic 3D Component with SSR disabled ─────────────────────────────────
const RiskOrb3D = dynamic(() => import("../../components/RiskOrb3D"), {
  ssr: false,
  loading: () => (
    <div className="w-[140px] h-[140px] flex items-center justify-center font-mono text-[10px] text-gray-500">
      LOADING ORB...
    </div>
  ),
});

// ── Tab & Mode Definitions ─────────────────────────────────────────────────
type ViewMode = "standard" | "quant_pro";

type Tab =
  | "live"
  | "portfolio"
  | "ml_regime"
  | "backtest"
  | "vault"
  | "execution"
  | "audit"
  | "stress";

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ElementType;
  section: "market" | "analysis" | "execution" | "risk";
}

const TABS: TabDef[] = [
  // Market
  { id: "live", label: "Live Market", icon: Sparkles, section: "market" },
  { id: "portfolio", label: "Portfolio Audit", icon: Wallet, section: "market" },
  // Analysis
  { id: "ml_regime", label: "ML Regime Engine", icon: BrainCircuit, section: "analysis" },
  { id: "backtest", label: "Backtest Engine", icon: BarChart3, section: "analysis" },
  { id: "vault", label: "Vault Simulator", icon: Vault, section: "analysis" },
  // Execution
  { id: "execution", label: "Execution Terminal", icon: Terminal, section: "execution" },
  // Risk
  { id: "audit", label: "Cryptographic Audit", icon: ShieldCheck, section: "risk" },
  { id: "stress", label: "Stress Test", icon: Activity, section: "risk" },
];

const SECTIONS = [
  { id: "market", label: "Market Data", index: "001" },
  { id: "analysis", label: "Quantitative", index: "002" },
  { id: "execution", label: "Execution", index: "003" },
  { id: "risk", label: "Risk & Audit", index: "004" },
];

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

function fmt(v: number, prefix = "$", dec = 0) {
  const n = Math.abs(v);
  const s =
    n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(dec);
  return `${v < 0 ? "-" : ""}${prefix}${s}`;
}

function sign(v: number, suffix = "") {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}${suffix}`;
}

export default function TerminalPage() {
  // Mode: "standard" or "quant_pro"
  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [tab, setTab] = useState<Tab>("live");

  // Selected asset shared across screener, execution dock, and breadcrumb
  const [selectedAsset, setSelectedAsset] = useState<string>("SOL");

  // Backtest state
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Advanced execution modal state
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [modalSymbol, setModalSymbol] = useState("SOL");
  const [modalNotional, setModalNotional] = useState(1000);

  // Interactive right-panel stress test slider
  const [spotPriceShock, setSpotPriceShock] = useState<number>(0);

  // UTC countdown clock
  const [countdown, setCountdown] = useState("00:00");

  const { isConnected, address } = useAccount();
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  // Next UTC hour countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
      const diffMs = nextHour.getTime() - now.getTime();
      const mins = Math.floor(diffMs / 60000).toString().padStart(2, "0");
      const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, "0");
      setCountdown(`${mins}:${secs}`);
    };
    updateCountdown();
    const timerId = setInterval(updateCountdown, 1000);
    return () => clearInterval(timerId);
  }, []);

  // Backtest runner
  const handleRun = async (req: BacktestRequest) => {
    setIsRunning(true);
    setError(null);
    try {
      setResult(await runBacktest(req));
    } catch (e: any) {
      setError(e.message || "Backtest failed");
    } finally {
      setIsRunning(false);
    }
  };

  // Pre-load backtest data on load so standard mode charts are populated
  useEffect(() => {
    if (!result && !isRunning) {
      handleRun(DEFAULT_BT_REQ);
    }
  }, []);

  // Compute live stress state for the 3D Orb and margin panel
  const stressState = useMemo(() => {
    return calculateStressState({
      portfolio_capital: 100_000,
      leverage_ratio: 1.0,
      spot_price_shock_pct: spotPriceShock,
      basis_divergence_bps: 0,
      maintenance_margin_req: 0.05,
    });
  }, [spotPriceShock]);

  const m = result?.summary;

  const openAdvancedExecution = (sym: string, notional: number) => {
    setModalSymbol(sym);
    setModalNotional(notional);
    setExecModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-white selection:bg-[var(--mint)]/20 font-sans">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── ERGONOMIC INDUSTRIAL COMMAND BAR (HEADER) ───────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#07090e]/95 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Pair Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <img
              src={`${BASE_PATH}/assets/Logo_Wide.jpg`}
              alt="Synthro"
              className="h-6 object-contain rounded"
            />
          </Link>
          <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />
          <div className="flex items-center gap-2 font-mono text-[11px] text-gray-400">
            <span className="text-white/40 hidden md:inline">[ SYNTHRO TERMINAL ]</span>
            <span className="text-[var(--mint)] font-bold">
              // ASSET: {selectedAsset}-PERP · BASIS ENGINE
            </span>
            <span className="text-white/30 hidden lg:inline">// HYPERLIQUID L1</span>
          </div>
        </div>

        {/* Center: Mode Switcher (Pill Toggle) */}
        <div className="flex items-center bg-black/60 border border-white/[0.12] rounded p-0.5">
          <button
            onClick={() => setViewMode("standard")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono transition-all ${
              viewMode === "standard"
                ? "bg-[var(--mint)] text-[#06080d] font-bold shadow-[0_0_12px_rgba(13,242,164,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Zap className="w-3 h-3" />
            Standard Mode
          </button>
          <button
            onClick={() => setViewMode("quant_pro")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono transition-all ${
              viewMode === "quant_pro"
                ? "bg-[var(--cyan)] text-[#06080d] font-bold shadow-[0_0_12px_rgba(0,216,246,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            Quant Pro Mode
          </button>
        </div>

        {/* Right: Persistent Quick Actions & Clock */}
        <div className="flex items-center gap-3">
          {/* Countdown Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.08] font-mono text-[10px] text-gray-400 tabular-nums">
            <Clock className="w-3 h-3 text-[var(--mint)]" />
            <span className="hidden sm:inline">NEXT HOURLY FUNDING:</span>
            <span className="text-[var(--mint)] font-bold">{countdown}</span>
          </div>

          {/* Fast Demo Toggle */}
          <button
            onClick={toggleDemoMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border font-mono text-[10px] transition-colors ${
              isDemoMode
                ? "bg-[var(--mint)]/10 border-[var(--mint)]/40 text-[var(--mint)] font-bold"
                : "bg-white/[0.02] border-white/[0.08] text-gray-400 hover:text-white"
            }`}
            title="Single-click to toggle Whale Simulation Profile"
          >
            <Sparkles className="w-3 h-3" />
            {isDemoMode ? "Whale Demo: ON" : "Demo Account"}
          </button>

          {/* Network Status */}
          <div className="status-pill online text-[9px] py-1 px-2 hidden sm:inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] animate-ping-slow" />
            HL L1 · Mainnet
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── WORKSPACE CONTENT ───────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "standard" ? (
        /* ── STANDARD MODE: Streamlined 3-Zone Workstation ─────────────────── */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-50px)]">
          {/* ══ ZONE 1 (LEFT): Market Microstructure Screener ════════════════ */}
          <div className="lg:col-span-4 border-r border-white/[0.08] p-4 bg-[#080c14]/60 overflow-y-auto max-h-[calc(100vh-50px)] custom-scrollbar">
            <div className="mb-2">
              <span className="protocol-label">001 // MARKET MICROSTRUCTURE</span>
            </div>
            <LiveFundingMatrix
              selectedSymbol={selectedAsset}
              onSelectSymbol={(sym) => setSelectedAsset(sym)}
              isCompact={true}
            />
          </div>

          {/* ══ ZONE 2 (CENTER): Strategy Lab & 1-Click Execution Dock ═══════ */}
          <div className="lg:col-span-5 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-50px)] custom-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <span className="protocol-label">002 // STRATEGY LAB & EXECUTION</span>
                <h2 className="text-sm font-bold font-mono text-white mt-0.5">
                  Basis Carry Trajectory · {selectedAsset}-PERP
                </h2>
              </div>
              {result && <ExportActions data={result} />}
            </div>

            {/* Upper: Interactive Equity Curve */}
            {result && m ? (
              <EquityChart curve={result.equity_curve} metrics={m} />
            ) : (
              <div className="card-protocol p-8 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin mb-2" />
                <span className="font-mono text-xs text-gray-400">Loading strategy simulation...</span>
              </div>
            )}

            {/* Lower: 1-Click Basis Execution Dock */}
            <BasisExecutionDock
              symbol={selectedAsset}
              onOpenExecutionModal={openAdvancedExecution}
            />

            {/* Quick Metrics Bar */}
            {m && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs tabular-nums">
                <div className="card-protocol p-3">
                  <div className="text-[9px] text-gray-500 uppercase flex items-center justify-between">
                    <span>Net Return</span>
                    <TrendingUp className="w-3 h-3 text-[var(--mint)]" />
                  </div>
                  <div className="text-sm font-bold text-[var(--mint)] mt-1">
                    +{m.total_return_pct.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-gray-500">{sign(m.annualized_return_pct, "% CAGR")}</div>
                </div>

                <div className="card-protocol p-3">
                  <div className="text-[9px] text-gray-500 uppercase flex items-center justify-between">
                    <span>Sharpe Ratio</span>
                    <ShieldCheck className="w-3 h-3 text-[var(--cyan)]" />
                  </div>
                  <div className="text-sm font-bold text-[var(--cyan)] mt-1">
                    {m.sharpe_ratio.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-gray-500">Sortino {m.sortino_ratio.toFixed(2)}</div>
                </div>

                <div className="card-protocol p-3">
                  <div className="text-[9px] text-gray-500 uppercase flex items-center justify-between">
                    <span>Max Drawdown</span>
                    <Percent className="w-3 h-3 text-[var(--coral)]" />
                  </div>
                  <div className="text-sm font-bold text-[var(--coral)] mt-1">
                    -{m.max_drawdown_pct.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-gray-500">Calmar {m.calmar_ratio.toFixed(2)}</div>
                </div>

                <div className="card-protocol p-3">
                  <div className="text-[9px] text-gray-500 uppercase flex items-center justify-between">
                    <span>Funding Harvested</span>
                    <DollarSign className="w-3 h-3 text-[var(--mint)]" />
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {fmt(m.total_funding_usd)}
                  </div>
                  <div className="text-[10px] text-gray-500">{m.total_trades} Trades</div>
                </div>
              </div>
            )}
          </div>

          {/* ══ ZONE 3 (RIGHT): Sentinel & Portfolio Risk Panel ═══════════════ */}
          <div className="lg:col-span-3 border-l border-white/[0.08] p-4 bg-[#080c14]/80 space-y-4 overflow-y-auto max-h-[calc(100vh-50px)] custom-scrollbar">
            <div>
              <span className="protocol-label">003 // RISK SENTINEL & MARGIN BUFFER</span>
              <h2 className="text-sm font-bold font-mono text-white mt-0.5">
                Real-Time Delta Equilibrium
              </h2>
            </div>

            {/* 3D Risk Orb Widget */}
            <div className="card-protocol p-4 flex flex-col items-center justify-center relative overflow-hidden">
              <RiskOrb3D
                spotShockPct={spotPriceShock}
                healthStatus={stressState.health_status}
              />
              <div className="mt-2 text-center font-mono">
                <div className="text-[10px] uppercase font-bold text-gray-400">
                  Dual-Ring Gyroscope Status
                </div>
                <div
                  className={`text-xs font-bold ${
                    stressState.health_status === "SAFE"
                      ? "text-[var(--mint)]"
                      : stressState.health_status === "WARNING"
                      ? "text-amber-400"
                      : "text-[var(--coral)]"
                  }`}
                >
                  {stressState.health_status === "SAFE"
                    ? "DELTA-NEUTRAL (BALANCED)"
                    : stressState.health_status === "WARNING"
                    ? "MARGIN SKEW WARNING"
                    : "CRITICAL MARGIN DEFICIT"}
                </div>
              </div>
            </div>

            {/* Account Health Factor Gauge */}
            <div className="card-protocol p-3.5 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-gray-400 uppercase text-[10px] font-bold">
                  Health Factor (HF)
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    stressState.health_status === "SAFE"
                      ? "text-[var(--mint)]"
                      : stressState.health_status === "WARNING"
                      ? "text-amber-400"
                      : "text-[var(--coral)]"
                  }`}
                >
                  {stressState.health_factor > 99 ? "99.0+" : stressState.health_factor.toFixed(2)}x
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/[0.08]">
                <div
                  className={`h-full transition-all duration-200 ${
                    stressState.health_status === "SAFE"
                      ? "bg-[var(--mint)]"
                      : stressState.health_status === "WARNING"
                      ? "bg-amber-400"
                      : "bg-[var(--coral)]"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(5, (stressState.health_factor / 3.0) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-gray-500">
                <span>LIQUIDATION (1.0x)</span>
                <span>WARN (2.0x)</span>
                <span className="text-[var(--mint)]">SAFE (&gt;2.5x)</span>
              </div>
            </div>

            {/* Stress Test Slider with Instantaneous Feedback */}
            <div className="card-protocol p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[var(--cyan)]" />
                  Simulated Spot Shock
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    spotPriceShock < 0
                      ? "text-[var(--coral)]"
                      : spotPriceShock > 0
                      ? "text-[var(--mint)]"
                      : "text-gray-400"
                  }`}
                >
                  {spotPriceShock > 0 ? "+" : ""}
                  {(spotPriceShock * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={spotPriceShock}
                onChange={(e) => setSpotPriceShock(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[var(--cyan)]"
              />
              <div className="flex justify-between text-[9px] font-mono text-gray-500">
                <button
                  onClick={() => setSpotPriceShock(-0.4)}
                  className="hover:text-[var(--coral)] transition-colors"
                >
                  -40% Crash
                </button>
                <button
                  onClick={() => setSpotPriceShock(0)}
                  className="hover:text-white transition-colors"
                >
                  Reset (0%)
                </button>
                <button
                  onClick={() => setSpotPriceShock(0.4)}
                  className="hover:text-[var(--mint)] transition-colors"
                >
                  +40% Squeeze
                </button>
              </div>
            </div>

            {/* Plain-language Metric Tooltips Card */}
            <div className="card-protocol p-3.5 space-y-2 text-xs font-mono">
              <div className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1 mb-1">
                <Info className="w-3 h-3 text-[var(--mint)]" />
                Key Formula Definitions
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex flex-col">
                  <span className="text-gray-400 font-bold">Sharpe Ratio:</span>
                  <span className="text-gray-500 text-[10px]">
                    (Annualized Yield − RiskFree) / Annualized Volatility
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400 font-bold">Calmar Ratio:</span>
                  <span className="text-gray-500 text-[10px]">
                    Compound Annual Growth (CAGR) / Max Drawdown
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400 font-bold">Delta Neutrality:</span>
                  <span className="text-gray-500 text-[10px]">
                    Net Delta = Spot Notional + Perp Notional ≈ 0.00
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400 font-bold">Health Factor:</span>
                  <span className="text-gray-500 text-[10px]">
                    Margin Balance / Maintenance Margin Requirement
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── QUANT PRO MODE: Deep Technical Multi-Tab Workspace ───────────── */
        <div className="workstation-layout">
          {/* ══ LEFT SIDEBAR — Navigation ════════════════════════════════════ */}
          <aside className="workstation-sidebar">
            <div className="mb-4 px-1">
              <span className="protocol-label">QUANT PRO WORKBENCH</span>
            </div>

            {SECTIONS.map((sec) => {
              const sectionTabs = TABS.filter((t) => t.section === sec.id);
              return (
                <div key={sec.id} className="mb-2">
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
                    </button>
                  ))}
                </div>
              );
            })}
          </aside>

          {/* ══ CENTER MAIN — Deep Analysis Canvas ═══════════════════════════ */}
          <main className="workstation-main">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="protocol-label">
                  {SECTIONS.find((s) => TABS.find((t) => t.id === tab)?.section === s.id)?.index ?? "000"}
                  {" // "}
                  {TABS.find((t) => t.id === tab)?.label?.toUpperCase() ?? "TERMINAL"}
                </span>
                <h1 className="text-base font-bold text-white mt-0.5 font-mono">
                  {TABS.find((t) => t.id === tab)?.label ?? "Terminal"}
                </h1>
              </div>
              {tab === "backtest" && <ExportActions data={result} />}
            </div>

            {/* Tab Views */}
            {tab === "live" && (
              <LiveFundingMatrix
                selectedSymbol={selectedAsset}
                onSelectSymbol={(sym) => setSelectedAsset(sym)}
              />
            )}
            {tab === "portfolio" && <WalletAudit />}
            {tab === "ml_regime" && <RegimeInspector />}
            {tab === "stress" && <StressTester />}
            {tab === "vault" && <VaultTearSheet />}

            {tab === "execution" && (
              <div className="space-y-6">
                <BasisExecutionDock
                  symbol={selectedAsset}
                  onOpenExecutionModal={openAdvancedExecution}
                />
                <TestnetDispatcher />
                <ExecutionTerminal />
              </div>
            )}

            {tab === "audit" && (
              <div className="space-y-6">
                <OnChainAudit />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card-protocol p-6 h-[480px]">
                    <h3 className="font-mono text-xs font-bold text-white uppercase tracking-widest mb-4">
                      ERC-4626 Architecture
                    </h3>
                    <p className="text-gray-400 font-mono text-xs leading-relaxed mb-4">
                      The Synthro HyperVault uses a customized ERC-4626 implementation that anchors all state proofs
                      on-chain via keccak256 Merkle roots.
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
                  <div
                    className="p-4 rounded-xl border font-mono text-xs"
                    style={{
                      background: "rgba(244,63,94,0.08)",
                      borderColor: "rgba(244,63,94,0.3)",
                      color: "#f43f5e",
                    }}
                  >
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
                  </>
                )}
              </div>
            )}
          </main>

          {/* ══ RIGHT CONTEXT PANEL ══════════════════════════════════════════ */}
          <aside className="workstation-panel space-y-4">
            <div className="kpi-label">Risk Sentinel</div>

            {/* Embedded 3D Risk Orb in Quant Pro Panel */}
            <div className="card-protocol p-3 flex flex-col items-center justify-center">
              <RiskOrb3D spotShockPct={spotPriceShock} healthStatus={stressState.health_status} />
              <div className="text-[10px] font-mono text-[var(--mint)] mt-1 font-bold">
                DELTA-NEUTRAL ORB
              </div>
            </div>

            {m && (
              <div className="space-y-2">
                <div className="kpi-row">
                  <div className="kpi-label">Net Profit</div>
                  <div className={`kpi-value ${m.net_profit_usd >= 0 ? "text-[var(--mint)]" : "text-[var(--coral)]"}`}>
                    {fmt(m.net_profit_usd)}
                  </div>
                </div>
                <div className="kpi-row">
                  <div className="kpi-label">Sharpe Ratio</div>
                  <div className="kpi-value text-[var(--cyan)]">{m.sharpe_ratio.toFixed(2)}</div>
                </div>
                <div className="kpi-row">
                  <div className="kpi-label">Max Drawdown</div>
                  <div className="kpi-value text-[var(--coral)]">-{m.max_drawdown_pct.toFixed(2)}%</div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ── Advanced Basis Execution Modal ─────────────────────────────────── */}
      <BasisExecutionModal
        isOpen={execModalOpen}
        onClose={() => setExecModalOpen(false)}
        initialSymbol={modalSymbol}
        initialSizeUsdc={modalNotional}
      />
    </div>
  );
}
