"use client";

import React, { useState, useEffect } from "react";
import { FundingSnapshot } from "../lib/types";
import { fetchFunding } from "../lib/api";
import { RefreshCw, ArrowUpDown, Zap } from "lucide-react";

export const LiveFundingMatrix: React.FC = () => {
  const [data, setData] = useState<FundingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"spread" | "hl" | "oi">("spread");
  const [sortAsc, setSortAsc] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await fetchFunding()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, []);

  const rates = data ? [...data.rates].sort((a, b) => {
    const diff = sortBy === "spread" ? a.spread_annualized_pct - b.spread_annualized_pct
      : sortBy === "hl" ? a.hl_funding_annualized_pct - b.hl_funding_annualized_pct
      : a.hl_open_interest_usd - b.hl_open_interest_usd;
    return sortAsc ? diff : -diff;
  }) : [];

  const handleSort = (key: "spread" | "hl" | "oi") => {
    if (sortBy === key) setSortAsc(!sortAsc); else { setSortBy(key); setSortAsc(false); }
  };

  const signalColor: Record<string, string> = {
    STRONG_LONG: "bg-hl-green/15 text-hl-green border-hl-green/30",
    LONG: "bg-hl-cyan/10 text-hl-cyan border-hl-cyan/30",
    NEUTRAL: "bg-bg-elevated text-gray-400 border-border-strong",
    SHORT: "bg-hl-amber/10 text-hl-amber border-hl-amber/30",
    STRONG_SHORT: "bg-hl-rose/10 text-hl-rose border-hl-rose/30",
  };

  if (loading && !data) {
    return (
      <div className="glass rounded-xl p-8 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-hl-cyan animate-spin mr-2" />
        <span className="font-mono text-sm text-gray-400">Loading HL funding feeds...</span>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-hl-cyan" />
          <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
            HL 1H vs CEX 8H Funding Matrix
          </h2>
          <span className="px-2 py-0.5 rounded bg-bg-elevated border border-border-strong text-[9px] font-mono text-hl-green font-bold uppercase">
            {data?.network || "TESTNET"} · LIVE
          </span>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-gray-400 hover:text-white transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-hl-cyan" : ""}`} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-bg-elevated/60 border-b border-border-subtle text-[10px] text-gray-500 uppercase">
            <tr>
              <th className="py-3 px-4">Asset</th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("hl")}>
                <span className="flex items-center gap-1">HL 1H Rate <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="py-3 px-4">HL Annual</th>
              <th className="py-3 px-4">CEX 8H Rate</th>
              <th className="py-3 px-4">CEX Annual</th>
              <th className="py-3 px-4 cursor-pointer hover:text-hl-cyan text-hl-cyan" onClick={() => handleSort("spread")}>
                <span className="flex items-center gap-1">HL−CEX Spread <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="py-3 px-4">Mark Price</th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("oi")}>
                <span className="flex items-center gap-1">Open Interest <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="py-3 px-4 text-right">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            {rates.map((r) => (
              <tr key={r.symbol} className="hover:bg-bg-elevated/40 transition-colors">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-hl-cyan" />
                  {r.symbol}
                </td>
                <td className="py-3 px-4 text-gray-300">{(r.hl_funding_1h * 100).toFixed(4)}%</td>
                <td className={`py-3 px-4 font-semibold ${r.hl_funding_annualized_pct > 0 ? "text-hl-green" : "text-hl-rose"}`}>
                  {r.hl_funding_annualized_pct > 0 ? "+" : ""}{r.hl_funding_annualized_pct.toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-gray-400">{(r.cex_funding_8h * 100).toFixed(4)}%</td>
                <td className="py-3 px-4 text-gray-300">+{r.cex_funding_annualized_pct.toFixed(2)}%</td>
                <td className="py-3 px-4">
                  <span className={`text-sm font-bold ${r.spread_annualized_pct > 0 ? "text-hl-cyan" : "text-hl-rose"}`}>
                    {r.spread_annualized_pct > 0 ? "+" : ""}{r.spread_annualized_pct.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-300">
                  ${r.hl_mark_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-gray-400">
                  ${(r.hl_open_interest_usd / 1e6).toFixed(1)}M
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${signalColor[r.signal] || signalColor.NEUTRAL}`}>
                    {r.signal}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
