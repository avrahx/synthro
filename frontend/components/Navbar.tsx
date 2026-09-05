"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { checkHealth, BASE_PATH } from "../lib/api";
import { Wifi, WifiOff, Wallet, ChevronDown, LogOut, Sparkles, Copy, Check, Home, Terminal } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useDemoMode } from "./DemoContext";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [health, setHealth] = useState<{
    status: string;
    latencyMs: number;
    network: string;
  }>({ status: "CHECKING", latencyMs: 0, network: "testnet" });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  useEffect(() => {
    setMounted(true);
    const poll = async () => setHealth(await checkHealth());
    poll();
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isTerminal = pathname?.startsWith("/terminal");

  return (
    <header className="h-14 border-b border-border-subtle bg-bg-raised/90 backdrop-blur-lg sticky top-0 z-50 flex items-center justify-between px-6">
      {/* Brand */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center group h-10 overflow-hidden rounded">
          <img src={`${BASE_PATH}/assets/Logo_Wide.jpg`} alt="Synthro" className="h-full object-contain" />
        </Link>

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

        {/* Page Nav */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-bg-elevated border border-border-subtle font-mono text-xs">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              !isTerminal
                ? "bg-bg-raised text-synthro-cyan font-bold border border-border-strong shadow-glow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Home className="w-3 h-3" />
            Home
          </Link>
          <Link
            href="/terminal"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              isTerminal
                ? "bg-bg-raised text-synthro-cyan font-bold border border-border-strong shadow-glow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Terminal className="w-3 h-3" />
            Terminal
          </Link>
        </nav>
      </div>

      {/* Status & Wallet Controls */}
      <div className="flex items-center gap-3">
        {/* Latency / Health */}
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

        {/* Demo Mode Toggle */}
        <button
          onClick={toggleDemoMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs transition-all ${
            isDemoMode
              ? "bg-hl-amber/15 border border-hl-amber/50 text-hl-amber shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold"
              : "bg-bg-elevated border border-border-subtle text-gray-400 hover:text-white hover:border-border-strong"
          }`}
          title="Toggle Demo Mode to audit a simulated Hyperliquid whale portfolio"
        >
          <Sparkles className="w-3.5 h-3.5 text-hl-amber" />
          <span className="hidden sm:inline">Demo Mode</span>
          {isDemoMode && <span className="w-1.5 h-1.5 rounded-full bg-hl-amber animate-pulse" />}
        </button>

        {/* Connect Wallet / Account Dropdown */}
        {mounted && isConnected && address ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-xs font-bold transition-all bg-synthro-mint/10 border border-synthro-mint/40 text-synthro-mint hover:bg-synthro-mint/20 shadow-[0_0_15px_rgba(13,242,164,0.15)]"
            >
              <div className="w-2 h-2 rounded-full bg-synthro-mint animate-pulse" />
              <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-bg-raised border border-border-strong p-2 shadow-2xl z-50 font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-2 border-b border-border-subtle mb-1">
                  <div className="text-[10px] uppercase text-gray-500 font-semibold">Connected Account</div>
                  <div className="flex items-center justify-between mt-1 text-white font-mono">
                    <span className="truncate mr-2">{address.slice(0, 10)}...{address.slice(-6)}</span>
                    <button
                      onClick={handleCopyAddress}
                      className="text-gray-400 hover:text-synthro-cyan transition-colors"
                      title="Copy Address"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-hl-mint" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="px-2 py-1.5 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>Network</span>
                  <span className="text-synthro-cyan font-semibold">Arbitrum / HL</span>
                </div>

                <button
                  onClick={() => {
                    disconnect();
                    setDropdownOpen(false);
                  }}
                  className="w-full mt-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-hl-rose hover:bg-hl-rose/10 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-xs font-bold transition-all bg-synthro-cyan/10 border border-synthro-cyan/40 hover:border-synthro-cyan text-synthro-cyan hover:bg-synthro-cyan/20 shadow-[0_0_15px_rgba(0,216,246,0.15)]"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Connect Wallet</span>
          </button>
        )}
      </div>
    </header>
  );
};
