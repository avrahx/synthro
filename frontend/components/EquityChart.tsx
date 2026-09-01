"use client";

import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { EquitySnapshot, SummaryMetrics } from "../lib/types";
import { TrendingUp } from "lucide-react";

interface Props {
  curve: EquitySnapshot[];
  metrics: SummaryMetrics;
}

export const EquityChart: React.FC<Props> = ({ curve, metrics }) => {
  const data = curve.map((pt) => ({ ...pt, shortTime: pt.timestamp.slice(5, 13) }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0C1017] border border-[#283352] rounded-lg p-3 font-mono text-[11px] text-white shadow-xl">
          <div className="text-gray-400 mb-2 border-b border-[#283352] pb-1">{label}</div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 mb-1">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold">
                {entry.name === "Drawdown" 
                  ? `-${Number(entry.value).toFixed(2)}%`
                  : `$${(Number(entry.value) / 1000).toFixed(2)}k`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-hl-cyan" />
            <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
              Strategy Equity Curve vs Benchmark
            </h2>
          </div>
          <p className="text-[11px] font-mono text-gray-500 mt-0.5">
            Synchronized dual-pane view · Hourly mark-to-market
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Top Pane: NAV vs Benchmark */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} syncId="equitySync">
              <defs>
                <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818CF8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2236" vertical={false} />
              <XAxis dataKey="shortTime" hide />
              <YAxis 
                stroke="#4B5563" 
                tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "monospace" }} 
                tickLine={false} 
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} 
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="nav" name="Strategy NAV" stroke="#22D3EE" strokeWidth={2} fillOpacity={1} fill="url(#navGrad)" />
              <Area type="monotone" dataKey="benchmark_nav" name="B&H Benchmark" stroke="#818CF8" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#benchGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Pane: Drawdown */}
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} syncId="equitySync">
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2236" vertical={false} />
              <XAxis 
                dataKey="shortTime" 
                stroke="#4B5563" 
                tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "monospace" }} 
                tickLine={false} 
                interval={Math.floor(data.length / 6)} 
              />
              <YAxis 
                stroke="#4B5563" 
                tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "monospace" }} 
                tickLine={false} 
                tickFormatter={(v) => `-${v}%`} 
                domain={[0, 'auto']}
                reversed
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="stepAfter" dataKey="drawdown_pct" name="Drawdown" stroke="#F43F5E" strokeWidth={1.5} fillOpacity={1} fill="url(#ddGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 font-mono text-xs border-t border-border-subtle">
        {[
          { label: "Sharpe", value: metrics.sharpe_ratio.toFixed(2), color: "text-hl-cyan" },
          { label: "Sortino", value: metrics.sortino_ratio.toFixed(2), color: "text-hl-green" },
          { label: "Max DD", value: `-${metrics.max_drawdown_pct.toFixed(2)}%`, color: "text-hl-rose" },
          { label: "Calmar", value: metrics.calmar_ratio.toFixed(2), color: "text-white" },
          { label: "Win Rate", value: `${metrics.win_rate_pct.toFixed(0)}%`, color: "text-hl-green" },
          { label: "Profit Factor", value: metrics.profit_factor.toFixed(2), color: "text-gray-300" },
        ].map((s) => (
          <div key={s.label} className="p-2.5 rounded-lg bg-bg-elevated/70 border border-border-subtle">
            <div className="text-[10px] text-gray-500 uppercase">{s.label}</div>
            <div className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
