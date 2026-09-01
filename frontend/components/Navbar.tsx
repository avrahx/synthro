"use client";

import React, { useEffect, useState } from "react";
import { checkHealth } from "../lib/api";
import { Zap, Wifi, WifiOff, ChevronDown } from "lucide-react";

export const Navbar: React.FC = () => {
  const [health, setHealth] = useState<{
    status: string;
    latencyMs: number;
    network: string;
  }>({ status: "CHECKING", latencyMs: 0, network: "testnet" });

  useEffect(() => {
    const poll = async () => setHealth(await checkHealth());
    poll();
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-14 border-b border-border-subtle bg-bg-raised/90 backdrop-blur-lg sticky top-0 z-50 flex items-center justify-between px-6">
      {/* Brand */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-hl-cyan via-hl-blue to-hl-violet flex items-center justify-center shadow-glow">
            <Zap className="w-4.5 h-4.5 text-black stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-sm font-black tracking-[0.12em] text-white group-hover:text-hl-cyan transition-colors">
              SYNTHRO
            </span>
            <span className="text-[9px] font-mono text-gray-500 tracking-wider -mt-0.5">
              HYPERVAULT ALPHA ENGINE
            </span>
          </div>
        </div>

        {/* Network Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-elevated border border-border-subtle text-[10px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              health.network === "mainnet"
                ? "bg-hl-green shadow-glow-green"
                : "bg-hl-amber animate-pulse-subtle"
            }`}
          />
          <span className="text-gray-300 uppercase font-semibold">
            {health.network}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-bg-elevated border border-border-subtle text-[10px] font-mono text-gray-500">
          <span>HL L1</span>
          <span className="text-border-strong">|</span>
          <span>1H FUNDING</span>
          <span className="text-border-strong">|</span>
          <span>DELTA NEUTRAL</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-elevated border border-border-subtle text-xs font-mono">
          {health.status === "ONLINE" ? (
            <Wifi className="w-3.5 h-3.5 text-hl-green" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-hl-rose" />
          )}
          <span
            className={`font-semibold ${
              health.status === "ONLINE"
                ? "text-hl-green"
                : health.status === "CHECKING"
                ? "text-hl-amber"
                : "text-hl-rose"
            }`}
          >
            {health.status === "ONLINE"
              ? `API · ${health.latencyMs}ms`
              : health.status}
          </span>
        </div>
      </div>
    </header>
  );
};
