"use client";

import React, { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { EquitySnapshot, SummaryMetrics } from "../lib/types";
import { TrendingUp } from "lucide-react";

interface Props {
  curve: EquitySnapshot[];
  metrics: SummaryMetrics;
}

type Mode = "nav" | "drawdown" | "funding";

export const EquityChart: React.FC<Props> = ({ curve, metrics }) => {
  const [mode, setMode] = useState<Mode>("nav");

  const data = curve.map((pt) => ({ ...pt, shortTime: pt.timestamp.slice(5, 13) }));

  const modeConfig: Record<Mode, { key: string; label: string; color: string; grad: string; fmt: (v: number) => string }> = {
    nav:      { key: "nav",                label: "NAV ($)",        color: "#22D3EE", grad: "navGrad",  fmt: (v) => `$${(v / 1000).toFixed(0)}k` },
    drawdown: { key: "drawdown_pct",       label: "Drawdown (%)",   color: "#F43F5E", grad: "ddGrad",   fmt: (v) => `-${v}%` },
    funding:  { key: "cumulative_funding", label: "Cum. Funding ($)", color: "#4ADE80", grad: "fundGrad", fmt: (v) => `$${(v / 1000).toFixed(1)}k` },
  };

  const cfg = modeConfig[mode];

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-hl-cyan" />
            <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
              Strategy Equity Curve
            </h2>
          </div>
          <p className="text-[11px] font-mono text-gray-500 mt-0.5">
            Hourly mark-to-market NAV · HL 1h funding settlement cadence
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-elevated border border-border-subtle font-mono text-xs">
          {(["nav", "drawdown", "funding"] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md transition-all ${
                mode === m
                  ? m === "drawdown" ? "bg-hl-rose text-white font-bold"
                    : m === "funding" ? "bg-hl-green text-black font-bold shadow-glow-green"
                    : "bg-hl-cyan text-black font-bold shadow-glow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {modeConfig[m].label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2236" vertical={false} />
            <XAxis dataKey="shortTime" stroke="#4B5563" tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "monospace" }} tickLine={false} interval={Math.floor(data.length / 6)} />
            <YAxis stroke="#4B5563" tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "monospace" }} tickLine={false} tickFormatter={cfg.fmt} />
            <Tooltip contentStyle={{ backgroundColor: "#0C1017", borderColor: "#283352", borderRadius: "8px", fontFamily: "monospace", fontSize: "11px", color: "#FFF" }} />
            <Area type="monotone" dataKey={cfg.key} stroke={cfg.color} strokeWidth={2} fillOpacity={1} fill={`url(#${cfg.grad})`} />
          </AreaChart>
        </ResponsiveContainer>
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
