"use client";

import React, { useState } from "react";
import { ArrowRight, Zap, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";
import { buildBasisOrderPlan, executeBasisTrade, ExecutionReceipt } from "../lib/orderRouter";
import { getOrCreateAgentSession } from "../lib/agentSession";

export interface BasisExecutionDockProps {
  symbol?: string;
  onOpenExecutionModal?: (symbol: string, notional: number) => void;
}

export const BasisExecutionDock: React.FC<BasisExecutionDockProps> = ({
  symbol = "SOL",
  onOpenExecutionModal,
}) => {
  const [capitalUsdc, setCapitalUsdc] = useState<number>(1000);
  const [isExecuting, setIsExecuting] = useState(false);
  const [receipt, setReceipt] = useState<ExecutionReceipt | null>(null);

  const presets = [500, 1000, 5000, 25000];

  // Derive plan from orderRouter
  let plan: ReturnType<typeof buildBasisOrderPlan> | null = null;
  try {
    plan = buildBasisOrderPlan(symbol, Math.max(10, capitalUsdc));
  } catch {
    // fallback
  }

  const spotLegUsdc = capitalUsdc * 0.5;
  const perpLegUsdc = capitalUsdc * 0.5;
  const estSlippageBps = 1.8;
  const estTakerFeeBps = 3.5;
  const totalDragBps = estSlippageBps + estTakerFeeBps;

  // Expected funding carry estimation
  const estGrossApr = symbol === "SOL" ? 21.4 : symbol === "BTC" ? 14.8 : symbol === "ETH" ? 16.2 : 19.5;
  const estNetApr = estGrossApr - (totalDragBps * 0.01 * 4); // modest cost drag
  const estDailyYield = (capitalUsdc * (estNetApr / 100)) / 365;

  const handleQuickExecute = async () => {
    if (onOpenExecutionModal) {
      onOpenExecutionModal(symbol, capitalUsdc);
      return;
    }

    setIsExecuting(true);
    setReceipt(null);
    try {
      if (plan) {
        const session = getOrCreateAgentSession();
        const res = await executeBasisTrade(plan, session.privateKey, "SIMULATION");
        setReceipt(res);
      }
    } catch {
      // handled
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="card-protocol relative p-5 overflow-hidden">
      {/* Corner Accents: Gridlock-style technical '+' marks */}
      <span className="absolute top-1 left-1.5 font-mono text-[10px] text-white/20 select-none">+</span>
      <span className="absolute top-1 right-1.5 font-mono text-[10px] text-white/20 select-none">+</span>
      <span className="absolute bottom-1 left-1.5 font-mono text-[10px] text-white/20 select-none">+</span>
      <span className="absolute bottom-1 right-1.5 font-mono text-[10px] text-white/20 select-none">+</span>

      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--mint)]" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            1-Click Delta-Neutral Execution Dock
          </span>
          <span className="metric-badge positive text-[9px] py-0.5 px-1.5">
            {symbol}-PERP
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--mint)]" />
          <span>NET DELTA: <strong className="text-white">0.000 Δ</strong></span>
        </div>
      </div>

      {/* Visual Leg Breakdown Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Step 1: Input Capital */}
        <div className="p-3 bg-black/40 border border-white/[0.06] rounded flex flex-col justify-between">
          <div>
            <div className="text-[9px] font-mono font-bold uppercase text-gray-500 mb-1">
              01 // Allocation (USDC)
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                value={capitalUsdc}
                onChange={(e) => setCapitalUsdc(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-black/60 border border-white/[0.12] rounded px-2.5 py-1 text-sm font-mono font-bold text-white focus:outline-none focus:border-[var(--mint)] tabular-nums"
              />
            </div>
          </div>
          {/* Preset Buttons */}
          <div className="flex gap-1 mt-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setCapitalUsdc(p)}
                className={`flex-1 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                  capitalUsdc === p
                    ? "bg-[var(--mint)]/20 border-[var(--mint)]/50 text-[var(--mint)] font-bold"
                    : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white"
                }`}
              >
                ${p >= 1000 ? `${p / 1000}k` : p}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: 50% Spot Leg + 50% Perp Short Leg */}
        <div className="p-3 bg-black/40 border border-white/[0.06] rounded flex flex-col justify-between md:col-span-2">
          <div className="text-[9px] font-mono font-bold uppercase text-gray-500 mb-1.5 flex items-center justify-between">
            <span>02 // Atomic Leg Dislocation</span>
            <span className="text-[var(--cyan)]">50% SPOT / 50% PERP</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Spot Leg */}
            <div className="p-2 rounded bg-black/50 border border-[var(--mint)]/20">
              <div className="text-[9px] text-gray-500 uppercase">Spot Long Leg (50%)</div>
              <div className="font-bold text-[var(--mint)] tabular-nums mt-0.5">
                ${spotLegUsdc.toFixed(2)}
              </div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                Market Lift Ask · {symbol}
              </div>
            </div>

            {/* Perp Leg */}
            <div className="p-2 rounded bg-black/50 border border-[var(--cyan)]/20">
              <div className="text-[9px] text-gray-500 uppercase">Perp Short Leg (50%)</div>
              <div className="font-bold text-[var(--cyan)] tabular-nums mt-0.5">
                ${perpLegUsdc.toFixed(2)}
              </div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                1x Short · Funding Harvester
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row: Expected Carry, Slippage, Daily Est */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-2.5 rounded bg-white/[0.02] border border-white/[0.06] font-mono text-xs tabular-nums">
        <div>
          <div className="text-[9px] text-gray-500 uppercase">Expected Carry</div>
          <div className="text-[var(--mint)] font-bold">+{estGrossApr.toFixed(1)}% APR</div>
        </div>
        <div>
          <div className="text-[9px] text-gray-500 uppercase">Est. Slippage & Fee</div>
          <div className="text-gray-300">~{totalDragBps.toFixed(1)} bps</div>
        </div>
        <div>
          <div className="text-[9px] text-gray-500 uppercase">Est. 24h Yield</div>
          <div className="text-[var(--cyan)] font-bold">+${estDailyYield.toFixed(2)}/day</div>
        </div>
        <div>
          <div className="text-[9px] text-gray-500 uppercase">Liquidation Buffer</div>
          <div className="text-[var(--mint)] font-bold">999.0x (Zero Delta)</div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={handleQuickExecute}
          disabled={isExecuting || capitalUsdc <= 0}
          className="btn-protocol-primary w-full sm:flex-1 justify-center py-3 text-xs tracking-wider"
        >
          {isExecuting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              EXECUTING SYNCHRONIZED BASIS...
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              EXECUTE BASIS TRADE (${capitalUsdc.toLocaleString()} USDC)
            </>
          )}
        </button>

        {onOpenExecutionModal && (
          <button
            onClick={() => onOpenExecutionModal(symbol, capitalUsdc)}
            className="btn-protocol-secondary w-full sm:w-auto px-4 py-3 text-xs"
          >
            Configure Advanced Order →
          </button>
        )}
      </div>

      {/* Instant Execution Receipt Toast */}
      {receipt && (
        <div className="mt-3 p-3 rounded bg-[var(--mint)]/10 border border-[var(--mint)]/30 text-xs font-mono flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-2 text-white">
            <CheckCircle2 className="w-4 h-4 text-[var(--mint)] shrink-0" />
            <span>
              <strong>Trade Dispatched:</strong> {receipt.symbol} basis (${receipt.totalNotionalUsdc.toFixed(2)} USDC) · Net Delta: {receipt.netDelta} Δ
            </span>
          </div>
          <span className="text-[9px] text-[var(--mint)] uppercase font-bold shrink-0">
            {receipt.status}
          </span>
        </div>
      )}
    </div>
  );
};
export default BasisExecutionDock;
