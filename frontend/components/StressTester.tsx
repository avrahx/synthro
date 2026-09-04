"use client";

import React, { useState, useMemo } from "react";
import { calculateStressState, StressParams, StressResult } from "../lib/stressTest";
import { AlertTriangle, Activity, ShieldAlert, ArrowRightLeft } from "lucide-react";

export const StressTester: React.FC = () => {
  const [params, setParams] = useState<StressParams>({
    portfolio_capital: 100000,
    leverage_ratio: 1,
    spot_price_shock_pct: 0,
    basis_divergence_bps: 0,
    maintenance_margin_req: 0.05,
  });

  const result: StressResult = useMemo(() => calculateStressState(params), [params]);

  const applyPreset = (spotShock: number, basisDiv: number) => {
    setParams({ ...params, spot_price_shock_pct: spotShock, basis_divergence_bps: basisDiv });
  };

  // UI mapping for health factor
  const hfColor = result.health_status === "SAFE" ? "text-synthro-mint" : result.health_status === "WARNING" ? "text-amber-400" : "text-hl-rose";
  const hfBg = result.health_status === "SAFE" ? "bg-synthro-mint" : result.health_status === "WARNING" ? "bg-amber-400" : "bg-hl-rose";
  const hfBorder = result.health_status === "SAFE" ? "border-synthro-mint/30" : result.health_status === "WARNING" ? "border-amber-400/30" : "border-hl-rose/30";

  return (
    <div className="space-y-6">
      {/* Controls Card */}
      <div className="glass rounded-xl p-6 border border-border-subtle">
        <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2 mb-6">
          <Activity className="w-4 h-4 text-synthro-cyan" />
          Shock Parameters & Presets
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => applyPreset(-0.5, 0)} className="px-3 py-1.5 rounded bg-hl-rose/10 text-hl-rose border border-hl-rose/30 font-mono text-xs font-bold hover:bg-hl-rose/20 transition-colors">
                Flash Crash (-50% Spot)
              </button>
              <button onClick={() => applyPreset(0.6, 0)} className="px-3 py-1.5 rounded bg-hl-cyan/10 text-hl-cyan border border-hl-cyan/30 font-mono text-xs font-bold hover:bg-hl-cyan/20 transition-colors">
                Short Squeeze (+60% Spot)
              </button>
              <button onClick={() => applyPreset(0, -400)} className="px-3 py-1.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 font-mono text-xs font-bold hover:bg-amber-400/20 transition-colors">
                Basis Depeg (-400 bps)
              </button>
              <button onClick={() => applyPreset(0, 0)} className="px-3 py-1.5 rounded bg-bg-raised text-gray-400 border border-border-subtle font-mono text-xs hover:text-white transition-colors">
                Reset
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px] font-bold uppercase text-gray-400">
                  <span>Spot Price Shock</span>
                  <span className={params.spot_price_shock_pct < 0 ? "text-hl-rose" : params.spot_price_shock_pct > 0 ? "text-synthro-mint" : "text-gray-400"}>
                    {(params.spot_price_shock_pct > 0 ? "+" : "")}{(params.spot_price_shock_pct * 100).toFixed(1)}%
                  </span>
                </div>
                <input type="range" min="-0.7" max="1.0" step="0.01" value={params.spot_price_shock_pct}
                  onChange={(e) => setParams({ ...params, spot_price_shock_pct: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-border-strong rounded-lg appearance-none cursor-pointer accent-synthro-cyan"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px] font-bold uppercase text-gray-400">
                  <span>Perp Basis Skew</span>
                  <span className={params.basis_divergence_bps < 0 ? "text-amber-400" : params.basis_divergence_bps > 0 ? "text-synthro-mint" : "text-gray-400"}>
                    {(params.basis_divergence_bps > 0 ? "+" : "")}{params.basis_divergence_bps} bps
                  </span>
                </div>
                <input type="range" min="-500" max="500" step="10" value={params.basis_divergence_bps}
                  onChange={(e) => setParams({ ...params, basis_divergence_bps: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-border-strong rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase font-bold font-mono">Portfolio Capital ($)</label>
              <input type="number" value={params.portfolio_capital}
                onChange={(e) => setParams({ ...params, portfolio_capital: parseFloat(e.target.value) || 0 })}
                className="w-full bg-bg p-3 rounded text-sm text-white font-mono border border-border-strong focus:outline-none focus:border-synthro-cyan"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase font-bold font-mono">Leverage (Perp Leg)</label>
              <select value={params.leverage_ratio}
                onChange={(e) => setParams({ ...params, leverage_ratio: parseFloat(e.target.value) })}
                className="w-full bg-bg p-3 rounded text-sm text-white font-mono border border-border-strong focus:outline-none focus:border-synthro-cyan"
              >
                <option value={1}>1.0x (Standard)</option>
                <option value={2}>2.0x</option>
                <option value={3}>3.0x</option>
              </select>
            </div>
            <div className="col-span-2 p-3 bg-bg-raised border border-border-subtle rounded-lg">
              <div className="text-[10px] text-gray-500 uppercase font-bold font-mono mb-1">Delta Neutral Layout</div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-hl-green">Long Spot: ${(params.portfolio_capital * params.leverage_ratio).toLocaleString()}</span>
                <span className="text-hl-rose">Short Perp: -${(params.portfolio_capital * params.leverage_ratio).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Health Factor Gauge */}
        <div className={`glass rounded-xl p-6 border ${hfBorder} flex flex-col justify-between transition-colors`}>
          <div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">Health Factor</h3>
              <span className={`px-2 py-1 rounded text-[10px] font-bold border ${hfBorder} ${hfColor} bg-bg-raised`}>
                {result.health_status}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-black tracking-tighter font-mono ${hfColor}`}>
                {result.health_factor > 99 ? "99+" : result.health_factor.toFixed(2)}
              </span>
              <span className="text-gray-500 text-sm font-mono">HF</span>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden flex">
              <div className={`h-full ${hfBg} transition-all duration-500`} style={{ width: `${Math.min(100, (result.health_factor / 3) * 100)}%` }} />
            </div>
            
            <div className="flex justify-between items-center text-xs font-mono">
              <div className="text-gray-400">Dist. to Liquidation</div>
              <div className={result.liquidation_distance_pct > 0 ? "text-synthro-mint font-bold" : "text-hl-rose font-bold"}>
                {result.liquidation_distance_pct > 0 ? "+" : ""}{result.liquidation_distance_pct.toFixed(1)}% price move
              </div>
            </div>
          </div>
        </div>

        {/* Unrealized PnL Waterfall */}
        <div className="glass rounded-xl p-6 border border-border-subtle">
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide mb-6">Unrealized PnL Matrix</h3>
          
          <div className="space-y-5 font-mono text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Spot Leg PnL</span>
                <span className={result.spot_unrealized_pnl >= 0 ? "text-synthro-mint font-bold" : "text-hl-rose font-bold"}>
                  {result.spot_unrealized_pnl >= 0 ? "+" : ""}${result.spot_unrealized_pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="w-full h-1 bg-bg-elevated rounded overflow-hidden">
                <div className={`h-full ${result.spot_unrealized_pnl >= 0 ? "bg-synthro-mint" : "bg-hl-rose"} transition-all`} style={{ width: `${Math.min(100, Math.abs(result.spot_unrealized_pnl) / params.portfolio_capital * 100)}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Perp Leg PnL</span>
                <span className={result.perp_unrealized_pnl >= 0 ? "text-synthro-mint font-bold" : "text-hl-rose font-bold"}>
                  {result.perp_unrealized_pnl >= 0 ? "+" : ""}${result.perp_unrealized_pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="w-full h-1 bg-bg-elevated rounded overflow-hidden">
                <div className={`h-full ${result.perp_unrealized_pnl >= 0 ? "bg-synthro-mint" : "bg-hl-rose"} transition-all`} style={{ width: `${Math.min(100, Math.abs(result.perp_unrealized_pnl) / params.portfolio_capital * 100)}%` }} />
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle flex justify-between items-center text-sm">
              <span className="text-white font-bold uppercase">Net PnL Delta</span>
              <span className={`font-black ${result.net_unrealized_pnl >= 0 ? "text-synthro-cyan" : "text-hl-rose"}`}>
                {result.net_unrealized_pnl >= 0 ? "+" : ""}${result.net_unrealized_pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            
            <p className="text-[10px] text-gray-500 mt-2">
              Delta neutral design ensures that large spot crashes are entirely offset by perp short gains, leaving the net PnL stable. 
              The only variable is Basis Divergence.
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Rebalance Protocol Card */}
      {result.auto_rebalance_usd > 0 && (
        <div className="p-4 rounded-xl border border-hl-cyan/40 bg-hl-cyan/5 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-2 bg-hl-cyan/20 rounded-lg shrink-0">
            <ShieldAlert className="w-5 h-5 text-hl-cyan" />
          </div>
          <div>
            <h4 className="text-white font-mono text-sm font-bold flex items-center gap-2">
              Protocol Action: Smart Rebalance Triggered
            </h4>
            <p className="text-gray-300 text-xs font-mono mt-1 leading-relaxed">
              Health Factor dropped below 2.5 safe threshold. The protocol is auto-swapping spot collateral into USDC margin to defend the short position.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="px-3 py-1.5 rounded bg-bg-elevated border border-border-subtle font-mono text-xs text-white">
                Sell Spot
              </div>
              <ArrowRightLeft className="w-3 h-3 text-gray-500" />
              <div className="px-3 py-1.5 rounded bg-synthro-cyan/20 border border-synthro-cyan/40 font-mono text-xs text-synthro-cyan font-bold">
                +${result.auto_rebalance_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC Margin
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
