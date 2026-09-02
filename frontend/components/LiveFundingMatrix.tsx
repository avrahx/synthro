"use client";

import React, { useState, useEffect } from "react";
import { FundingSnapshot } from "../lib/types";
import { fetchFunding } from "../lib/api";
import { RefreshCw, ArrowUpDown, Zap, Search, Filter } from "lucide-react";

export const LiveFundingMatrix: React.FC = () => {
  const [data, setData] = useState<FundingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"apr" | "oi" | "vol">("apr");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "POSITIVE" | "TOP10">("ALL");
  const [countdown, setCountdown] = useState("00:00");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchFunding();
      setData(res);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const intervalId = setInterval(load, 15000); // 15 seconds poll
    return () => clearInterval(intervalId);
  }, []);

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

  let filtered = data ? [...data.rates] : [];

  if (search) {
    filtered = filtered.filter(r => r.symbol.toLowerCase().includes(search.toLowerCase()));
  }

  if (filterMode === "POSITIVE") {
    filtered = filtered.filter(r => r.hl_funding_annualized_pct > 0);
  }

  filtered.sort((a, b) => {
    const diff = sortBy === "apr" ? a.hl_funding_annualized_pct - b.hl_funding_annualized_pct
      : sortBy === "vol" ? (a.volume24h || 0) - (b.volume24h || 0)
      : a.hl_open_interest_usd - b.hl_open_interest_usd;
    return sortAsc ? diff : -diff;
  });

  if (filterMode === "TOP10") {
    // Sort by APR descending regardless of current sort to pick top 10, then resort?
    // Actually if they click Top 10 APY, we just take the top 10 of the sorted list
    // Wait, "Top 10 APY" implies the top 10 by APY.
    // Let's filter by top 10 APY first, then apply their sort.
    let top10 = [...(data?.rates || [])].sort((a, b) => b.hl_funding_annualized_pct - a.hl_funding_annualized_pct).slice(0, 10);
    // Apply search
    if (search) top10 = top10.filter(r => r.symbol.toLowerCase().includes(search.toLowerCase()));
    
    top10.sort((a, b) => {
      const diff = sortBy === "apr" ? a.hl_funding_annualized_pct - b.hl_funding_annualized_pct
        : sortBy === "vol" ? (a.volume24h || 0) - (b.volume24h || 0)
        : a.hl_open_interest_usd - b.hl_open_interest_usd;
      return sortAsc ? diff : -diff;
    });
    filtered = top10;
  }

  const handleSort = (key: "apr" | "oi" | "vol") => {
    if (sortBy === key) setSortAsc(!sortAsc); else { setSortBy(key); setSortAsc(false); }
  };

  const formatShort = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  const isLive = data?.network?.toLowerCase() === "mainnet";

  if (loading && !data) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-hl-cyan animate-spin mb-4" />
        <span className="font-mono text-sm text-gray-400">CONNECTING TO HYPERLIQUID L1...</span>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-hl-cyan" />
          <h2 className="font-mono text-base font-bold text-white uppercase tracking-wide">
            Live Funding Matrix
          </h2>
          <div className={`flex items-center px-2 py-1 rounded border text-[10px] font-mono font-bold uppercase tracking-wider ${isLive ? 'bg-synthro-mint/10 border-synthro-mint/30 text-synthro-mint' : 'bg-orange-500/10 border-orange-500/30 text-orange-500'}`}>
            <span className={`w-2 h-2 rounded-full mr-1.5 ${isLive ? 'bg-synthro-mint animate-pulse' : 'bg-orange-500'}`} />
            {isLive ? "LIVE HL MAINNET" : "CACHED FALLBACK"}
          </div>
          <div className="px-2 py-1 bg-bg-elevated rounded border border-border-strong text-xs font-mono text-gray-300">
            Next Tick: <span className="text-synthro-mint ml-1">{countdown}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-bg-elevated border border-border-subtle rounded-lg text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-synthro-cyan"
            />
          </div>

          {/* Filter */}
          <div className="flex bg-bg-elevated border border-border-subtle rounded-lg p-0.5">
            {(["ALL", "POSITIVE", "TOP10"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${filterMode === mode ? 'bg-synthro-cyan/20 text-synthro-cyan font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                {mode === "TOP10" ? "Top 10 APY" : mode === "POSITIVE" ? "Positive Only" : "All"}
              </button>
            ))}
          </div>

          <button onClick={load} className="ml-2 p-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-gray-400 hover:text-white transition-colors" title="Force Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-synthro-cyan" : ""}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-bg-elevated/90 sticky top-0 z-10 backdrop-blur-md border-b border-border-subtle text-[10px] text-gray-500 uppercase">
            <tr>
              <th className="py-3 px-4">Asset</th>
              <th className="py-3 px-4">Mark Price</th>
              <th className="py-3 px-4">1h Rate</th>
              <th className="py-3 px-4 cursor-pointer hover:text-synthro-cyan transition-colors" onClick={() => handleSort("apr")}>
                <span className="flex items-center gap-1">Annualized APR <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("oi")}>
                <span className="flex items-center gap-1">Open Interest <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("vol")}>
                <span className="flex items-center gap-1">24h Volume <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="py-3 px-4 text-right">Arbitrage Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            {filtered.map((r) => {
              const isPositive = r.hl_funding_1h > 0;
              const isUnwound = r.hl_funding_annualized_pct < -2.0;
              const colorClass = isUnwound ? "text-red-500 opacity-50" : (isPositive ? "text-synthro-mint" : "text-[#f43f5e]");
              const isHighYield = r.hl_funding_annualized_pct > 15;
              const rowBg = isUnwound ? "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-red-500" : "hover:bg-bg-elevated/60";

              return (
                <tr key={r.symbol} className={`transition-colors group ${rowBg}`}>
                  <td className={`py-3 px-4 font-bold flex items-center gap-2 ${isUnwound ? 'text-red-400' : 'text-white'}`}>
                    <span className={`w-2 h-2 rounded-full ${isUnwound ? 'bg-red-500' : 'bg-synthro-cyan'}`} />
                    <span className="text-sm">{r.symbol}</span>
                    {r.maxLeverage && (
                      <span className="px-1.5 py-0.5 rounded bg-bg-raised text-[9px] text-gray-400 border border-border-subtle">
                        {r.maxLeverage}x
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    ${r.hl_mark_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </td>
                  <td className={`py-3 px-4 font-medium ${colorClass}`}>
                    {isPositive ? "+" : ""}{(r.hl_funding_1h * 100).toFixed(4)}%
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${colorClass}`}>
                        {isPositive ? "+" : ""}{r.hl_funding_annualized_pct.toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-gray-500">vs {r.cex_funding_annualized_pct.toFixed(2)}% CEX</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {formatShort(r.hl_open_interest_usd)}
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {formatShort(r.volume24h || 0)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isUnwound ? (
                      <span className="inline-block px-2.5 py-1 rounded text-[10px] font-bold tracking-wider border bg-red-500/10 text-red-500 border-red-500/30">
                        NEGATIVE CARRY - UNWOUND
                      </span>
                    ) : isHighYield ? (
                      <span className="inline-block px-2.5 py-1 rounded text-[10px] font-bold tracking-wider border bg-synthro-mint/15 text-synthro-mint border-synthro-mint/30 shadow-[0_0_10px_rgba(77,235,214,0.2)]">
                        High Yield Opportunity
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border bg-bg-elevated text-gray-400 border-border-strong group-hover:border-border-subtle transition-colors">
                        {r.signal.replace("_", " ")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 font-mono text-sm">
                  No assets found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
