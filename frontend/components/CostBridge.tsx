"use client";

import React from "react";
import { SummaryMetrics } from "../lib/types";
import { Info } from "lucide-react";

interface Props {
  metrics: SummaryMetrics;
}

export const CostBridge: React.FC<Props> = ({ metrics }) => {
  const gross = metrics.gross_funding_yield_usdc || 1; // avoid div by 0
  const fees = metrics.exchange_taker_fees_usdc;
  const slippage = metrics.slippage_drag_usdc;
  const borrow = metrics.spot_borrow_costs_usdc;
  const net = metrics.net_realized_yield_usdc;

  // Calculate percentages relative to gross yield (total 100%)
  const pctFees = Math.max(0, (fees / gross) * 100);
  const pctSlippage = Math.max(0, (slippage / gross) * 100);
  const pctBorrow = Math.max(0, (borrow / gross) * 100);
  const pctNet = Math.max(0, (net / gross) * 100);

  // Position offsets for the waterfall
  const startFees = pctNet + pctBorrow + pctSlippage;
  const startSlippage = pctNet + pctBorrow;
  const startBorrow = pctNet;

  const feeAlphaRatio = ((fees + slippage + borrow) / gross) * 100;

  return (
    <div className="glass rounded-xl p-6 space-y-8">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
          Execution Cost Waterfall Bridge
        </h3>
      </div>

      {/* Waterfall Chart */}
      <div className="relative pt-6 pb-2">
        {/* Track lines */}
        <div className="absolute inset-0 flex justify-between px-2 opacity-10 pointer-events-none">
          {[0, 25, 50, 75, 100].map(step => (
            <div key={step} className="h-full w-px bg-white" />
          ))}
        </div>

        <div className="space-y-4 font-mono text-xs">
          {/* Gross Yield */}
          <div className="relative h-6 flex items-center group">
            <div className="absolute left-0 w-32 text-gray-400">Gross Yield</div>
            <div className="ml-32 flex-1 relative h-full bg-bg-elevated rounded overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 bg-[#0df2a4] rounded shadow-[0_0_10px_rgba(13,242,164,0.3)] transition-all duration-500" style={{ width: '100%' }} />
            </div>
            <div className="absolute right-0 text-white font-bold">${gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>

          {/* Taker Fees */}
          <div className="relative h-6 flex items-center group">
            <div className="absolute left-0 w-32 text-gray-400 flex items-center gap-1">
              Taker Fees
              <div className="group/tooltip relative">
                <Info className="w-3 h-3 text-gray-500 hover:text-white cursor-help" />
                <div className="absolute hidden group-hover/tooltip:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-bg-raised border border-border-subtle text-[10px] text-gray-300 rounded shadow-xl z-10">
                  Total exchange taker fees incurred during position entry, exit, and rebalancing turnover.
                </div>
              </div>
            </div>
            <div className="ml-32 flex-1 relative h-full bg-transparent">
              <div 
                className="absolute top-0 bottom-0 bg-[#f43f5e] rounded border border-[#f43f5e]/50 opacity-90 transition-all duration-500" 
                style={{ left: `${startFees}%`, width: `${pctFees}%` }} 
              />
            </div>
            <div className="absolute right-0 text-[#f43f5e] font-bold">-${fees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>

          {/* Slippage */}
          <div className="relative h-6 flex items-center group">
            <div className="absolute left-0 w-32 text-gray-400 flex items-center gap-1">
              Modeled Slippage
              <div className="group/tooltip relative">
                <Info className="w-3 h-3 text-gray-500 hover:text-white cursor-help" />
                <div className="absolute hidden group-hover/tooltip:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-bg-raised border border-border-subtle text-[10px] text-gray-300 rounded shadow-xl z-10">
                  Modeled slippage decay based on the requested slippage_bps parameter crossing the order book.
                </div>
              </div>
            </div>
            <div className="ml-32 flex-1 relative h-full bg-transparent">
              <div 
                className="absolute top-0 bottom-0 bg-[#fbbf24] rounded border border-[#fbbf24]/50 opacity-90 transition-all duration-500" 
                style={{ left: `${startSlippage}%`, width: `${pctSlippage}%` }} 
              />
            </div>
            <div className="absolute right-0 text-[#fbbf24] font-bold">-${slippage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>

          {/* Borrow Costs */}
          <div className="relative h-6 flex items-center group">
            <div className="absolute left-0 w-32 text-gray-400 flex items-center gap-1">
              Spot Borrow Cost
            </div>
            <div className="ml-32 flex-1 relative h-full bg-transparent">
              <div 
                className="absolute top-0 bottom-0 bg-hl-rose/60 rounded border border-hl-rose/40 opacity-90 transition-all duration-500" 
                style={{ left: `${startBorrow}%`, width: `${pctBorrow}%` }} 
              />
            </div>
            <div className="absolute right-0 text-hl-rose font-bold">-${borrow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>

          {/* Net Yield */}
          <div className="relative h-6 flex items-center group pt-2">
            <div className="absolute left-0 w-32 text-white font-bold flex items-center gap-1">
              Net Realized
            </div>
            <div className="ml-32 flex-1 relative h-full bg-bg-elevated rounded overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-[#00d8f6] rounded shadow-[0_0_10px_rgba(0,216,246,0.3)] transition-all duration-500" 
                style={{ width: `${pctNet}%` }} 
              />
            </div>
            <div className="absolute right-0 text-[#00d8f6] font-bold">${net.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border-subtle">
        <div className="p-3 rounded-lg bg-bg-elevated border border-border-subtle/50 space-y-1">
          <div className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider">Portfolio Turnover</div>
          <div className="text-sm text-white font-mono">{metrics.turnover_ratio.toFixed(2)}x</div>
        </div>
        <div className="p-3 rounded-lg bg-bg-elevated border border-border-subtle/50 space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider">
            Net Cost Rate
            <div className="group/tooltip relative">
              <Info className="w-3 h-3 cursor-help" />
              <div className="absolute hidden group-hover/tooltip:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-bg-raised border border-border-subtle text-[10px] text-gray-300 rounded shadow-xl z-10 normal-case">
                Total friction (fees + slippage) normalized over total gross yield as basis points.
              </div>
            </div>
          </div>
          <div className="text-sm text-white font-mono">{metrics.fee_drag_bps.toFixed(1)} bps</div>
        </div>
        <div className="p-3 rounded-lg bg-bg-elevated border border-border-subtle/50 space-y-1">
          <div className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider">Fee-to-Alpha Ratio</div>
          <div className="text-sm text-hl-rose font-mono">{feeAlphaRatio.toFixed(1)}%</div>
        </div>
        <div className="p-3 rounded-lg bg-bg-elevated border border-border-subtle/50 space-y-1">
          <div className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider">Fill Efficiency</div>
          <div className="text-sm text-hl-cyan font-mono">100.0%</div>
        </div>
      </div>
    </div>
  );
};
