"use client";

import React, { useState, useEffect } from "react";
import { fetchFunding } from "../lib/api";
import { FundingRateRow } from "../lib/types";
import { useDemoMode } from "./DemoContext";
import { Sparkles, Activity, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TickerItem {
  symbol: string;
  markPrice: number;
  fundingApr: number;
  openInterestUsd: number;
}

const DEFAULT_TICKER: TickerItem[] = [
  { symbol: "BTC", markPrice: 67420.5, fundingApr: 18.52, openInterestUsd: 412500000 },
  { symbol: "ETH", markPrice: 2841.2, fundingApr: 14.18, openInterestUsd: 198200000 },
  { symbol: "SOL", markPrice: 148.65, fundingApr: 21.05, openInterestUsd: 94600000 },
  { symbol: "HYPE", markPrice: 24.85, fundingApr: 26.4, openInterestUsd: 48200000 },
  { symbol: "PURR", markPrice: 0.245, fundingApr: -3.85, openInterestUsd: 12400000 },
];

export const TickerBar: React.FC = () => {
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const [tickerItems, setTickerItems] = useState<TickerItem[]>(DEFAULT_TICKER);
  const [countdown, setCountdown] = useState<string>("00:00");
  const [isTestnet, setIsTestnet] = useState<boolean>(true);

  // Poll live Hyperliquid rates
  useEffect(() => {
    let mounted = true;
    const loadRates = async () => {
      try {
        const snap = await fetchFunding();
        if (snap && snap.rates && snap.rates.length > 0 && mounted) {
          const map = new Map<string, FundingRateRow>();
          snap.rates.forEach((r) => map.set(r.symbol, r));

          const symbols = ["BTC", "ETH", "SOL", "HYPE", "PURR"];
          const updated: TickerItem[] = symbols.map((sym) => {
            const found = map.get(sym);
            if (found) {
              return {
                symbol: sym,
                markPrice: found.hl_mark_price,
                fundingApr: found.hl_funding_annualized_pct,
                openInterestUsd: found.hl_open_interest_usd,
              };
            }
            return DEFAULT_TICKER.find((d) => d.symbol === sym) || {
              symbol: sym,
              markPrice: 100,
              fundingApr: 15,
              openInterestUsd: 10000000,
            };
          });
          setTickerItems(updated);
        }
      } catch (err) {
        // use default tickers
      }
    };

    loadRates();
    const interval = setInterval(loadRates, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update countdown to next hourly funding tick
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

  // Duplicate stream items to achieve seamless infinite marquee loop
  const marqueeItems = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <div className="w-full h-8 bg-[#05070a] border-b border-white/[0.06] flex items-center justify-between text-[11px] font-mono select-none overflow-hidden relative z-50">
      {/* Left Fixed Pill: HYPERCORE L1 ENGINE */}
      <div className="shrink-0 h-full flex items-center gap-2 px-3 bg-[#080b11] border-r border-white/[0.06] z-20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hl-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-hl-green" />
        </span>
        <span className="text-white font-bold tracking-wider text-[10px] hidden sm:inline">
          HYPERCORE L1 ENGINE
        </span>
        <span className="text-synthro-cyan text-[10px] font-semibold sm:hidden">
          HL L1
        </span>
      </div>

      {/* Center Streaming Marquee Tape */}
      <div className="flex-1 h-full overflow-hidden relative flex items-center">
        {/* Soft edge gradient fades */}
        <div className="absolute left-0 inset-y-0 w-8 bg-gradient-to-r from-[#05070a] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-[#05070a] to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee items-center gap-6 cursor-pointer">
          {marqueeItems.map((item, idx) => {
            const isPositive = item.fundingApr >= 0;
            return (
              <div
                key={idx}
                className="flex items-center gap-2 shrink-0 px-2 py-0.5 rounded hover:bg-white/[0.04] transition-colors"
              >
                <span className="px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/[0.08] text-white font-bold text-[10px]">
                  {item.symbol}
                </span>

                <span className="text-gray-200">
                  ${item.markPrice >= 10
                    ? item.markPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
                    : item.markPrice.toFixed(3)}
                </span>

                <span
                  className={`flex items-center text-[10px] font-bold ${
                    isPositive ? "text-synthro-mint text-glow-mint" : "text-hl-rose"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {item.fundingApr.toFixed(2)}% APR
                </span>

                <span className="text-gray-500 text-[10px] hidden md:inline">
                  OI ${(item.openInterestUsd / 1e6).toFixed(1)}M
                </span>

                <span className="text-white/[0.1] ml-2">/</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Fixed Fast Actions Strip */}
      <div className="shrink-0 h-full flex items-center gap-2.5 px-3 bg-[#080b11] border-l border-white/[0.06] z-20">
        {/* Settlement Countdown */}
        <div className="flex items-center gap-1 text-gray-400 text-[10px] hidden md:flex" title="Time until next 1H funding settlement">
          <Clock className="w-3 h-3 text-synthro-cyan" />
          <span>Next Tick:</span>
          <span className="text-white font-bold">{countdown}</span>
        </div>

        {/* Network Switcher Pill */}
        <button
          onClick={() => setIsTestnet((prev) => !prev)}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] hover:border-synthro-cyan/40 transition-all text-[10px]"
          title="Toggle Target Network Display"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isTestnet ? "bg-hl-amber animate-pulse" : "bg-hl-green"}`} />
          <span className="text-gray-300 font-semibold">{isTestnet ? "Testnet" : "Mainnet"}</span>
        </button>

        {/* Demo Mode Pill */}
        <button
          onClick={toggleDemoMode}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all ${
            isDemoMode
              ? "bg-hl-amber/20 border border-hl-amber/50 text-hl-amber font-bold"
              : "bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white"
          }`}
          title="Quick Toggle Demo Mode"
        >
          <Sparkles className="w-2.5 h-2.5 text-hl-amber" />
          <span className="hidden sm:inline">Demo</span>
        </button>
      </div>
    </div>
  );
};
