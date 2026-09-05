"use client";

import React, { useEffect, useState } from "react";
import { checkHealth, BASE_PATH } from "../lib/api";
import { Wifi, WifiOff, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export const Navbar: React.FC = () => {
  const [health, setHealth] = useState<{
    status: string;
    latencyMs: number;
    network: string;
  }>({ status: "CHECKING", latencyMs: 0, network: "testnet" });

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect({ connector: injected() });
    }
  };

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

        {/* Connect Wallet Button */}
        <button 
          onClick={handleConnect}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-xs font-bold transition-all ${
            isConnected 
              ? "bg-synthro-mint/10 border border-synthro-mint/40 text-synthro-mint hover:bg-synthro-mint/20" 
              : "bg-synthro-cyan/10 border border-synthro-cyan/40 text-synthro-cyan hover:bg-synthro-cyan/20 shadow-[0_0_15px_rgba(0,216,246,0.15)]"
          }`}
        >
          {isConnected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-synthro-mint animate-pulse" />
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </>
          ) : (
            <>
              <Wallet className="w-3.5 h-3.5" />
              Connect Wallet
            </>
          )}
        </button>
      </div>
    </header>
  );
};
