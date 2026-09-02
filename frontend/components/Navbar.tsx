"use client";

import React, { useEffect, useState } from "react";
import { checkHealth, BASE_PATH } from "../lib/api";
import { Wifi, WifiOff, ChevronDown } from "lucide-react";

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
        <div className="flex items-center group h-10 overflow-hidden rounded">
          <img src={`${BASE_PATH}/assets/Logo_Wide.jpg`} alt="Synthro" className="h-full object-contain" />
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
