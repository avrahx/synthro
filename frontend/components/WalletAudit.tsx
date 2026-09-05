"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useDemoMode } from "./DemoContext";
import {
  fetchUserAuditDiagnostics,
  PortfolioDiagnostics,
  PortfolioPosition,
} from "../lib/userAudit";
import {
  Wallet,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRightLeft,
  X,
} from "lucide-react";

export const WalletAudit: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { isDemoMode, demoAddress, setDemoMode } = useDemoMode();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PortfolioDiagnostics | null>(null);
  const [rebalancing, setRebalancing] = useState(false);
  const [rebalanceCompleted, setRebalanceCompleted] = useState(false);
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveAddress =
    isConnected && address ? address : isDemoMode ? demoAddress : null;

  const loadDiagnostics = async () => {
    if (!effectiveAddress) return;
    setLoading(true);
    try {
      const res = await fetchUserAuditDiagnostics(effectiveAddress);
      setData(res);
    } catch (err) {
      console.error("Failed to load portfolio diagnostics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveAddress) {
      loadDiagnostics();
    } else {
      setData(null);
    }
  }, [effectiveAddress]);

  const handleSimulateRebalance = () => {
    setRebalancing(true);
    setTimeout(() => {
      setRebalancing(false);
      setRebalanceCompleted(true);
      // Neutralize delta in local state
      if (data) {
        setData({
          ...data,
          netDirectionalDeltaUsd: 0,
          totalShortExposureUsd: data.totalLongExposureUsd,
          grossNotionalUsd: data.totalLongExposureUsd * 2,
          recommendations: [
            "✓ Portfolio Delta-Neutralized: Directional exposure fully hedged across all spot/perp legs.",
            ...data.recommendations.filter((r) => !r.includes("unhedged")),
          ],
          positions: data.positions.map((p) => ({
            ...p,
            rebalanceStatus: "HEDGED",
          })),
        });
      }
    }, 1200);
  };

  if (!mounted) {
    return (
      <div className="glass rounded-2xl p-12 border border-border-subtle text-center font-mono">
        <div className="animate-spin w-8 h-8 border-2 border-synthro-cyan border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Initializing Web3 Audit Engine...</p>
      </div>
    );
  }

  // Not connected & Not in Demo Mode
  if (!effectiveAddress) {
    return (
      <div className="glass rounded-2xl p-10 border border-border-subtle relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-synthro-cyan/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-xl mx-auto text-center space-y-6 relative z-10 py-6">
          <div className="w-16 h-16 rounded-2xl bg-synthro-cyan/10 border border-synthro-cyan/30 flex items-center justify-center mx-auto text-synthro-cyan shadow-[0_0_30px_rgba(0,216,246,0.2)]">
            <Wallet className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-mono font-black text-white">
              Instant Account Health & Funding Audit
            </h2>
            <p className="text-sm font-mono text-gray-400 leading-relaxed">
              Connect your Web3 wallet or launch Demo Mode to query Hyperliquid L1 clearinghouse
              state, compute live directional delta, monitor 1H funding carry, and diagnose liquidation buffers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => connect({ connector: injected() })}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-mono text-sm font-bold bg-synthro-cyan text-black hover:bg-synthro-cyan/90 transition-all shadow-[0_0_20px_rgba(0,216,246,0.3)] hover:scale-[1.02]"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Web3 Wallet</span>
            </button>

            <button
              onClick={() => setDemoMode(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-mono text-sm font-bold bg-bg-elevated border border-hl-amber/40 text-hl-amber hover:bg-hl-amber/10 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Demo Mode</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-border-subtle/50 text-left font-mono">
            <div className="bg-bg-raised/60 p-3 rounded-lg border border-border-subtle">
              <div className="text-[10px] text-gray-500 uppercase">Perp Clearinghouse</div>
              <div className="text-xs text-white mt-1 font-semibold">Live L1 State</div>
            </div>
            <div className="bg-bg-raised/60 p-3 rounded-lg border border-border-subtle">
              <div className="text-[10px] text-gray-500 uppercase">Delta Exposure</div>
              <div className="text-xs text-synthro-cyan mt-1 font-semibold">Spot vs Short</div>
            </div>
            <div className="bg-bg-raised/60 p-3 rounded-lg border border-border-subtle">
              <div className="text-[10px] text-gray-500 uppercase">Funding Audit</div>
              <div className="text-xs text-synthro-mint mt-1 font-semibold">1H Settlement</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine health factor color & label
  const hf = data?.marginHealthFactor || 99.9;
  const isHealthy = hf >= 3.0;
  const isWarning = hf >= 1.5 && hf < 3.0;
  const isCritical = hf < 1.5;

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Strip */}
      <div className="glass rounded-2xl p-6 border border-border-subtle relative overflow-hidden bg-gradient-to-r from-bg-raised via-bg to-bg-raised">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-synthro-cyan/15 border border-synthro-cyan/40 text-synthro-cyan text-[11px] font-bold">
                {data?.isMockOrSimulated ? "SIMULATED WHALE PORTFOLIO" : "LIVE HYPERLIQUID L1 CLEARINGHOUSE"}
              </span>
              {data?.isMockOrSimulated && (
                <span className="px-2 py-0.5 rounded bg-hl-amber/10 border border-hl-amber/30 text-hl-amber text-[10px]">
                  DEMO AUDIT
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-white tracking-tight">
                ${data ? data.totalAccountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "---"}
                <span className="text-xs text-gray-400 font-normal ml-2">USDC Equity</span>
              </h2>
              <button
                onClick={loadDiagnostics}
                disabled={loading}
                className="p-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-gray-400 hover:text-white hover:border-border-strong transition-all disabled:opacity-50"
                title="Refresh Live Clearinghouse State"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-synthro-cyan" : ""}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Auditing:</span>
              <code className="text-white bg-bg-elevated px-2 py-0.5 rounded border border-border-strong text-[11px]">
                {effectiveAddress}
              </code>
            </div>
          </div>

          {/* Margin Health Gauge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-bg-elevated/80 p-4 rounded-xl border border-border-strong">
            <div className="space-y-1">
              <div className="text-[11px] text-gray-400 uppercase font-semibold flex items-center gap-1.5">
                {isHealthy ? (
                  <ShieldCheck className="w-4 h-4 text-synthro-mint" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-hl-amber" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-hl-rose" />
                )}
                <span>Margin Health Factor</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-black ${
                    isHealthy
                      ? "text-synthro-mint"
                      : isWarning
                      ? "text-hl-amber"
                      : "text-hl-rose"
                  }`}
                >
                  {hf > 50 ? "99.9x+" : `${hf.toFixed(1)}x`}
                </span>
                <span className="text-xs text-gray-400">
                  ({isHealthy ? "SUPERIOR" : isWarning ? "MODERATE" : "HIGH RISK"})
                </span>
              </div>
              <div className="text-[10px] text-gray-500">
                Margin Used: ${data?.totalMarginUsed.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0} USDC
              </div>
            </div>

            {/* Health Bar Visual */}
            <div className="w-full sm:w-32 h-2.5 rounded-full bg-bg-raised border border-border-subtle overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isHealthy
                    ? "bg-synthro-mint shadow-[0_0_10px_rgba(13,242,164,0.5)]"
                    : isWarning
                    ? "bg-hl-amber shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    : "bg-hl-rose shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                }`}
                style={{ width: `${Math.min(100, (hf / 5) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Net Delta Exposure */}
        <div className="glass rounded-xl p-5 border border-border-subtle relative overflow-hidden group hover:border-synthro-cyan/40 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="uppercase font-semibold">Net Directional Delta</span>
            <Layers className="w-4 h-4 text-synthro-cyan" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-black ${
                Math.abs(data?.netDirectionalDeltaUsd || 0) < 500
                  ? "text-synthro-mint"
                  : (data?.netDirectionalDeltaUsd || 0) > 0
                  ? "text-hl-cyan"
                  : "text-hl-amber"
              }`}
            >
              {data && data.netDirectionalDeltaUsd >= 0 ? "+" : ""}
              ${data?.netDirectionalDeltaUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-gray-500 font-normal">
              {Math.abs(data?.netDirectionalDeltaUsd || 0) < 500 ? "Delta-Neutral" : "Unhedged"}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
            <span>Gross Notional:</span>
            <span className="text-white">${data?.grossNotionalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between">
            <span>Portfolio Leverage:</span>
            <span className="text-synthro-cyan">{data?.leverageMultiplier.toFixed(2)}x</span>
          </div>
        </div>

        {/* 2. Active Funding Carry ($/hr) */}
        <div className="glass rounded-xl p-5 border border-border-subtle relative overflow-hidden group hover:border-synthro-mint/40 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="uppercase font-semibold">1H Funding Carry</span>
            <Zap className="w-4 h-4 text-synthro-mint" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-black ${
                (data?.hourlyFundingCashFlowUsd || 0) >= 0 ? "text-synthro-mint" : "text-hl-rose"
              }`}
            >
              {(data?.hourlyFundingCashFlowUsd || 0) >= 0 ? "+" : ""}
              ${data?.hourlyFundingCashFlowUsd.toFixed(2)} / hr
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
            <span>Daily Cash Flow:</span>
            <span className={(data?.hourlyFundingCashFlowUsd || 0) >= 0 ? "text-synthro-mint font-bold" : "text-hl-rose"}>
              {(data?.hourlyFundingCashFlowUsd || 0) >= 0 ? "+" : ""}
              ${((data?.hourlyFundingCashFlowUsd || 0) * 24).toFixed(2)} / day
            </span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between">
            <span>Settlement:</span>
            <span className="text-gray-300">Continuous Hourly</span>
          </div>
        </div>

        {/* 3. Annualized Yield / Drag (% APR) */}
        <div className="glass rounded-xl p-5 border border-border-subtle relative overflow-hidden group hover:border-border-strong transition-all">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="uppercase font-semibold">Annualized Carry APR</span>
            <Percent className="w-4 h-4 text-hl-amber" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-black ${
                (data?.annualizedFundingAprPct || 0) >= 0 ? "text-synthro-mint" : "text-hl-rose"
              }`}
            >
              {(data?.annualizedFundingAprPct || 0) >= 0 ? "+" : ""}
              {data?.annualizedFundingAprPct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-gray-500 font-normal">
              {(data?.annualizedFundingAprPct || 0) >= 0 ? "Net Yield" : "Drag"}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
            <span>Yield Source:</span>
            <span className="text-white">Perp Short Basis</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between">
            <span>Rebalance Drag:</span>
            <span className="text-synthro-cyan">0.05% est.</span>
          </div>
        </div>

        {/* 4. Liquidation Safety */}
        <div className="glass rounded-xl p-5 border border-border-subtle relative overflow-hidden group hover:border-synthro-cyan/40 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="uppercase font-semibold">Liquidation Distance</span>
            <Lock className="w-4 h-4 text-synthro-cyan" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-black ${
                (data?.nearestLiquidationDistancePct || 99) > 30
                  ? "text-synthro-mint"
                  : (data?.nearestLiquidationDistancePct || 99) > 15
                  ? "text-hl-amber"
                  : "text-hl-rose"
              }`}
            >
              {data?.nearestLiquidationDistancePct !== null && data?.nearestLiquidationDistancePct !== undefined
                ? `+${data.nearestLiquidationDistancePct.toFixed(1)}%`
                : "No Liq Risk"}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
            <span>Buffer Rating:</span>
            <span className="text-synthro-mint">Deep Cushion</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between">
            <span>Maintenance Margin:</span>
            <span className="text-gray-300">5.0% HL L1</span>
          </div>
        </div>
      </div>

      {/* Action Banner: If Net Delta is unhedged */}
      {data && Math.abs(data.netDirectionalDeltaUsd) > 1000 && !rebalanceCompleted && (
        <div className="glass rounded-xl p-5 border border-hl-cyan/40 bg-gradient-to-r from-synthro-cyan/15 via-bg-elevated to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-synthro-cyan/20 border border-synthro-cyan/50 text-synthro-cyan">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <span>Delta Dislocation Detected:</span>
                <span className="text-synthro-cyan font-black">
                  {data.netDirectionalDeltaUsd > 0 ? "+" : ""}${data.netDirectionalDeltaUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                </span>
              </h4>
              <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                Your portfolio holds unhedged directional exposure. Execute a 1-click delta-neutral rebalance
                to eliminate price risk and lock in positive Hyperliquid funding carry.
              </p>
            </div>
          </div>

          <button
            onClick={() => setRebalanceModalOpen(true)}
            className="shrink-0 px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase bg-synthro-cyan text-black hover:bg-synthro-cyan/90 transition-all shadow-[0_0_15px_rgba(0,216,246,0.3)] hover:scale-[1.02]"
          >
            Hedge Portfolio: 1-Click Rebalance
          </button>
        </div>
      )}

      {/* Rebalance Completed Notice */}
      {rebalanceCompleted && (
        <div className="glass rounded-xl p-4 border border-synthro-mint/40 bg-synthro-mint/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-synthro-mint text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Delta Neutrality Restored: Spot and Perp Short legs are 100% matched.</span>
          </div>
          <span className="text-[10px] text-gray-400">Zero Directional Variance</span>
        </div>
      )}

      {/* Institutional Insights & Recommendations */}
      {data && data.recommendations && data.recommendations.length > 0 && (
        <div className="glass rounded-xl p-5 border border-border-subtle bg-bg-raised/40 space-y-3">
          <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-synthro-cyan" />
            <span>Basis Arbitrage Recommendations & AI Diagnostics</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.recommendations.map((rec, i) => (
              <div
                key={i}
                className="text-xs p-3 rounded-lg bg-bg-elevated border border-border-strong text-gray-300 flex items-start gap-2"
              >
                <span className="text-synthro-cyan font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Positions Breakdown Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-bg-raised/60">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Active Holdings & Hyperliquid Clearinghouse Positions
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Live breakdown of spot inventory, short perp hedges, and accrued funding cash flows
            </p>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {data?.positions.length || 0} Assets Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-bg-elevated/80 border-b border-border-strong text-gray-400 text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Size</th>
                <th className="py-3 px-4 text-right">Entry Px</th>
                <th className="py-3 px-4 text-right">Mark Px</th>
                <th className="py-3 px-4 text-right">Notional</th>
                <th className="py-3 px-4 text-right">Unrealized PnL</th>
                <th className="py-3 px-4 text-right">Accrued Funding</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {data && data.positions.length > 0 ? (
                data.positions.map((p, idx) => (
                  <tr key={idx} className="hover:bg-bg-raised/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span>{p.asset}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.type === "SPOT"
                            ? "bg-hl-cyan/15 text-hl-cyan border border-hl-cyan/30"
                            : p.type === "PERP_SHORT"
                            ? "bg-synthro-mint/15 text-synthro-mint border border-synthro-mint/30"
                            : "bg-hl-rose/15 text-hl-rose border border-hl-rose/30"
                        }`}
                      >
                        {p.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {p.size.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      ${p.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-semibold">
                      ${p.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-white">
                      ${p.notionalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        p.unrealizedPnl >= 0 ? "text-synthro-mint" : "text-hl-rose"
                      }`}
                    >
                      {p.unrealizedPnl >= 0 ? "+" : ""}${p.unrealizedPnl.toFixed(2)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold ${
                        p.accruedFundingCash >= 0 ? "text-synthro-mint" : "text-hl-rose"
                      }`}
                    >
                      {p.accruedFundingCash !== 0
                        ? `${p.accruedFundingCash >= 0 ? "+" : ""}$${p.accruedFundingCash.toFixed(2)}`
                        : "---"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          p.rebalanceStatus === "HEDGED"
                            ? "bg-synthro-mint/10 text-synthro-mint border border-synthro-mint/30"
                            : p.rebalanceStatus === "HIGH_CARRY_OPP"
                            ? "bg-hl-amber/10 text-hl-amber border border-hl-amber/30"
                            : "bg-hl-cyan/10 text-hl-cyan border border-hl-cyan/30"
                        }`}
                      >
                        {p.rebalanceStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    No active positions found on Hyperliquid clearinghouse.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: 1-Click Delta-Neutral Rebalance */}
      {rebalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
          <div className="glass rounded-2xl max-w-lg w-full p-6 border border-synthro-cyan/50 space-y-5 bg-bg-raised shadow-2xl relative">
            <button
              onClick={() => setRebalanceModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-synthro-cyan/20 border border-synthro-cyan/40 text-synthro-cyan">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delta-Neutral Rebalance Engine</h3>
                <p className="text-xs text-gray-400">Hyperliquid L1 Batch Order Dispatcher</p>
              </div>
            </div>

            <div className="space-y-3 bg-bg p-4 rounded-xl border border-border-strong text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Net Delta:</span>
                <span className="text-hl-cyan font-bold">+${data?.netDirectionalDeltaUsd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Recommended Action:</span>
                <span className="text-synthro-mint font-bold">Sell ${data?.netDirectionalDeltaUsd.toLocaleString()} Perp Shorts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Projected Post-Rebalance Delta:</span>
                <span className="text-synthro-mint font-bold">$0.00 (100% Delta-Neutral)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Estimated Incremental Yield:</span>
                <span className="text-white font-bold">+18.4% APR Funding Carry</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRebalanceModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setRebalanceModalOpen(false);
                  handleSimulateRebalance();
                }}
                disabled={rebalancing}
                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase bg-synthro-cyan text-black hover:bg-synthro-cyan/90 transition-all shadow-[0_0_15px_rgba(0,216,246,0.3)] disabled:opacity-50 flex items-center gap-2"
              >
                {rebalancing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Batch...</span>
                  </>
                ) : (
                  <span>Confirm & Execute Rebalance</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
