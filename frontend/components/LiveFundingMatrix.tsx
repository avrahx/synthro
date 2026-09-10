"use client";

import React, { useState, useEffect } from "react";
import { FundingSnapshot, FundingRateRow } from "../lib/types";
import { fetchFunding } from "../lib/api";
import { RefreshCw, ArrowUpDown, Zap, Search } from "lucide-react";

export interface LiveFundingMatrixProps {
  selectedSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
  isCompact?: boolean;
}

type FilterPill = "ALL" | "HIGH_YIELD" | "POSITIVE";

export const LiveFundingMatrix: React.FC<LiveFundingMatrixProps> = ({
  selectedSymbol = "SOL",
  onSelectSymbol,
  isCompact = false,
}) => {
  const [data, setData] = useState<FundingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"apr" | "oi" | "vol">("apr");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterPill>("ALL");
  const [countdown, setCountdown] = useState("00:00");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchFunding();
      setData(res);
    } catch {
      // fetchFunding falls back gracefully; no crash
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const intervalId = setInterval(load, 15000);
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
    filtered = filtered.filter((r) =>
      r.symbol.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (filterMode === "HIGH_YIELD") {
    filtered = filtered.filter((r) => r.hl_funding_annualized_pct >= 15.0);
  } else if (filterMode === "POSITIVE") {
    filtered = filtered.filter((r) => r.hl_funding_annualized_pct > 0);
  }

  filtered.sort((a, b) => {
    const diff =
      sortBy === "apr"
        ? a.hl_funding_annualized_pct - b.hl_funding_annualized_pct
        : sortBy === "vol"
        ? (a.volume24h || 0) - (b.volume24h || 0)
        : a.hl_open_interest_usd - b.hl_open_interest_usd;
    return sortAsc ? diff : -diff;
  });

  const handleSort = (key: "apr" | "oi" | "vol") => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  const formatShort = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  const isLive = data?.network?.toLowerCase() === "mainnet";

  // Micro-sparkline generator for visual momentum
  const renderSparkline = (row: FundingRateRow) => {
    const isPos = row.hl_funding_annualized_pct > 0;
    const height = 18;
    const width = 48;
    const baseApr = Math.min(Math.max(row.hl_funding_annualized_pct, -50), 100);
    const strokeColor = isPos ? "#0df2a4" : "#f43f5e";

    // Synthetic 5-point sparkline based on row values
    const seed = row.symbol.charCodeAt(0) % 5;
    const points = [
      [0, height / 2 + (seed - 2) * 2],
      [12, height / 2 + ((seed + 1) % 4 - 2) * 2],
      [24, height / 2 - (isPos ? 3 : -3)],
      [36, height / 2 + (isPos ? -2 : 3)],
      [48, height / 2 - (baseApr > 15 ? 6 : baseApr < 0 ? -6 : 1)],
    ];
    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible shrink-0 opacity-80 group-hover:opacity-100">
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={points[4][0]} cy={points[4][1]} r="2" fill={strokeColor} />
      </svg>
    );
  };

  if (loading && !data) {
    return (
      <div className="card-protocol p-8 flex flex-col items-center justify-center">
        <RefreshCw className="w-7 h-7 text-[var(--cyan)] animate-spin mb-3" />
        <span className="font-mono text-xs text-gray-400">CONNECTING TO HYPERLIQUID L1...</span>
      </div>
    );
  }

  return (
    <div className="card-protocol overflow-hidden flex flex-col h-full">
      {/* Header & Controls */}
      <div className="p-3.5 border-b border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--cyan)]" />
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Market Microstructure
            </span>
            <span className={`status-pill ${isLive ? "online" : "warn"} ml-1 text-[9px] py-0.5 px-1.5`}>
              {isLive ? "HL L1 MAINNET" : "CACHED"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
            <span>Tick:</span>
            <span className="text-[var(--mint)] font-bold">{countdown}</span>
            <button
              onClick={load}
              className="ml-1.5 p-1 rounded hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-[var(--cyan)]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search & Segmented Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Filter asset (e.g. SOL, BTC)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-black/40 border border-white/[0.08] rounded text-xs text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-[var(--cyan)] transition-colors"
            />
          </div>

          <div className="flex bg-black/50 border border-white/[0.08] rounded p-0.5 gap-0.5 shrink-0">
            {(
              [
                { id: "ALL", label: "ALL" },
                { id: "HIGH_YIELD", label: "HIGH YIELD >15%" },
                { id: "POSITIVE", label: "POSITIVE ONLY" },
              ] as const
            ).map((pill) => (
              <button
                key={pill.id}
                onClick={() => setFilterMode(pill.id)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors whitespace-nowrap ${
                  filterMode === pill.id
                    ? "bg-[var(--cyan)]/20 text-[var(--cyan)] font-bold border border-[var(--cyan)]/40"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dense Rows Table */}
      <div className="overflow-x-auto flex-1 overflow-y-auto max-h-[640px] custom-scrollbar">
        <table className="w-full text-left font-mono text-xs tabular-nums">
          <thead className="bg-[#0a0e16]/95 sticky top-0 z-10 backdrop-blur-md border-b border-white/[0.08] text-[9px] text-gray-500 uppercase">
            <tr>
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-2">Mark Price</th>
              <th
                className="py-2.5 px-2 cursor-pointer hover:text-[var(--cyan)] transition-colors"
                onClick={() => handleSort("apr")}
              >
                <span className="flex items-center gap-1">
                  1h / APR <ArrowUpDown className="w-2.5 h-2.5" />
                </span>
              </th>
              {!isCompact && (
                <th
                  className="py-2.5 px-2 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("oi")}
                >
                  <span className="flex items-center gap-1">
                    OI <ArrowUpDown className="w-2.5 h-2.5" />
                  </span>
                </th>
              )}
              <th className="py-2.5 px-2 text-right">Trend / Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map((r) => {
              const isSelected = selectedSymbol.toUpperCase() === r.symbol.toUpperCase();
              const isPositive = r.hl_funding_1h > 0;
              const isUnwound = r.hl_funding_annualized_pct < -2.0;
              const colorClass = isUnwound
                ? "text-[var(--coral)] opacity-60"
                : isPositive
                ? "text-[var(--mint)]"
                : "text-[var(--coral)]";
              const isHighYield = r.hl_funding_annualized_pct >= 15.0;

              return (
                <tr
                  key={r.symbol}
                  onClick={() => onSelectSymbol?.(r.symbol)}
                  className={`transition-all group cursor-pointer ${
                    isSelected
                      ? "bg-[rgba(13,242,164,0.08)] border-l-2 border-[var(--mint)]"
                      : "hover:bg-white/[0.03] border-l-2 border-transparent"
                  }`}
                >
                  {/* Asset */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? "bg-[var(--mint)] animate-pulse"
                            : isUnwound
                            ? "bg-[var(--coral)]"
                            : "bg-[var(--cyan)]"
                        }`}
                      />
                      <span className={`font-bold text-xs ${isSelected ? "text-[var(--mint)]" : "text-white"}`}>
                        {r.symbol}
                      </span>
                      {r.maxLeverage && (
                        <span className="px-1 py-0.2 rounded bg-white/[0.04] text-[8px] text-gray-400 border border-white/[0.06]">
                          {r.maxLeverage}x
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Mark Price */}
                  <td className="py-2.5 px-2 text-gray-300">
                    ${r.hl_mark_price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </td>

                  {/* 1h / APR */}
                  <td className="py-2.5 px-2">
                    <div className="flex flex-col leading-tight">
                      <span className={`font-bold text-xs ${colorClass}`}>
                        {isPositive ? "+" : ""}
                        {r.hl_funding_annualized_pct.toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-gray-500">
                        {isPositive ? "+" : ""}
                        {(r.hl_funding_1h * 100).toFixed(4)}%/h
                      </span>
                    </div>
                  </td>

                  {/* OI (hidden in compact) */}
                  {!isCompact && (
                    <td className="py-2.5 px-2 text-gray-400 text-[11px]">
                      {formatShort(r.hl_open_interest_usd)}
                    </td>
                  )}

                  {/* Trend & Signal */}
                  <td className="py-2.5 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden sm:block">{renderSparkline(r)}</div>
                      {isHighYield ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-[var(--mint)]/10 text-[var(--mint)] border border-[var(--mint)]/30">
                          {r.hl_funding_annualized_pct.toFixed(0)}% APR
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono text-gray-400 border border-white/[0.06]">
                          {r.signal.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 font-mono text-xs">
                  No assets match current criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default LiveFundingMatrix;
