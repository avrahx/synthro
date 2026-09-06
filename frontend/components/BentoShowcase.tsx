"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  BrainCircuit,
  ShieldCheck,
  Activity,
  Wallet,
  BarChart3,
  Zap,
  TrendingUp,
  Lock,
} from "lucide-react";

interface BentoFeature {
  id: string;
  icon: React.ElementType;
  label: string;
  title: string;
  description: string;
  accent: string;
  accentBg: string;
  colSpan?: string;
  visual?: React.ReactNode;
}

// ── Mini visual for ML Regime block ──────────────────────────────────────────
function RegimeVisual() {
  const states = [
    { label: "BULL CARRY", pct: 52, color: "#0df2a4" },
    { label: "HIGH VOL", pct: 31, color: "#FBBF24" },
    { label: "BEAR/UNWIND", pct: 17, color: "#F43F5E" },
  ];
  return (
    <div className="mt-3 space-y-2">
      {states.map((s) => (
        <div key={s.label} className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-gray-500 w-24 shrink-0">{s.label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: s.color }}
              initial={{ width: 0 }}
              animate={{ width: `${s.pct}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
          <span style={{ color: s.color }} className="font-bold w-8 text-right">{s.pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Mini visual for Stress Test block ────────────────────────────────────────
function StressVisual() {
  const scenarios = [
    { label: "-70% crash", health: 12, color: "#F43F5E" },
    { label: "-40% shock", health: 48, color: "#FBBF24" },
    { label: "0% baseline", health: 100, color: "#0df2a4" },
  ];
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {scenarios.map((s) => (
        <div
          key={s.label}
          className="rounded-lg p-2.5 text-center"
          style={{ background: `${s.color}11`, border: `1px solid ${s.color}30` }}
        >
          <div className="font-mono font-black text-sm" style={{ color: s.color }}>
            {s.health}%
          </div>
          <div className="font-mono text-[9px] text-gray-500 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Mini visual for funding heat ─────────────────────────────────────────────
function FundingVisual() {
  const assets = ["BTC", "ETH", "SOL", "HYPE", "ARB"];
  const rates = [28.4, 19.2, 41.7, 89.3, 12.1];
  return (
    <div className="mt-3 flex items-end gap-1.5 h-12">
      {assets.map((a, i) => (
        <div key={a} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            className="w-full rounded-t"
            style={{
              background: `linear-gradient(180deg, #0df2a4 0%, #00d8f6 100%)`,
              opacity: 0.7,
            }}
            initial={{ height: 0 }}
            animate={{ height: `${(rates[i] / 90) * 100}%` }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
          />
          <span className="font-mono text-[8px] text-gray-500">{a}</span>
        </div>
      ))}
    </div>
  );
}

// ── BENTO FEATURE DEFINITIONS ────────────────────────────────────────────────
function useBentoFeatures(): BentoFeature[] {
  return [
    {
      id: "ml",
      icon: BrainCircuit,
      label: "Intelligence Layer",
      title: "ML Regime Classification",
      description:
        "Gaussian Hidden Markov Model auto-classifies market state into Bull Carry, High Volatility, and Bear Unwind regimes — dynamically resizing position exposure.",
      accent: "#00d8f6",
      accentBg: "rgba(0,216,246,0.06)",
      colSpan: "lg:col-span-2",
      visual: <RegimeVisual />,
    },
    {
      id: "stress",
      icon: Activity,
      label: "Risk Engine",
      title: "Black Swan Stress Tester",
      description:
        "Simulate -70% market crashes and 500bps basis divergences to validate margin health and liquidation distance in real-time.",
      accent: "#F43F5E",
      accentBg: "rgba(244,63,94,0.06)",
      visual: <StressVisual />,
    },
    {
      id: "funding",
      icon: Zap,
      label: "Alpha Source",
      title: "1-Hour Funding Harvester",
      description:
        "Captures positive hourly funding rate carry across BTC, ETH, SOL, HYPE, and ARB perpetuals on Hyperliquid L1 with delta-neutral hedging.",
      accent: "#0df2a4",
      accentBg: "rgba(13,242,164,0.06)",
      visual: <FundingVisual />,
    },
    {
      id: "audit",
      icon: Lock,
      label: "Cryptographic Trust",
      title: "On-Chain Merkle Audit Trail",
      description:
        "Every epoch's NAV, high-water mark, and delta exposure is hashed into a Merkle tree — creating a tamper-proof, cryptographically verifiable audit trail.",
      accent: "#A78BFA",
      accentBg: "rgba(167,139,250,0.06)",
    },
    {
      id: "wallet",
      icon: Wallet,
      label: "Portfolio Diagnostics",
      title: "Live Account Health Monitor",
      description:
        "Connect your wallet to fetch real-time Hyperliquid clearinghouse data: positions, funding accrual, margin ratio, unrealized PnL, and 24h funding earned.",
      accent: "#0df2a4",
      accentBg: "rgba(13,242,164,0.06)",
    },
    {
      id: "backtest",
      icon: BarChart3,
      label: "Simulation Engine",
      title: "Institutional Backtester",
      description:
        "Full historical simulation from June 2024 with granular fee modeling (maker/taker + slippage), 3h rebalancing, and ERC-4626 vault accounting.",
      accent: "#00d8f6",
      accentBg: "rgba(0,216,246,0.06)",
      colSpan: "lg:col-span-2",
    },
    {
      id: "shield",
      icon: ShieldCheck,
      label: "Risk Architecture",
      title: "Delta-Neutral by Design",
      description:
        "Spot-long + perp-short construction maintains near-zero market delta. Automatic unwind triggers activate when funding turns negative.",
      accent: "#4ADE80",
      accentBg: "rgba(74,222,128,0.06)",
    },
    {
      id: "perf",
      icon: TrendingUp,
      label: "Track Record",
      title: "+34.2% Annualized Alpha",
      description:
        "Backtested across volatile market regimes: 4.81 Sharpe, −2.3% max drawdown, 91.4% win rate — with full fee and slippage accounting.",
      accent: "#0df2a4",
      accentBg: "rgba(13,242,164,0.06)",
    },
  ];
}

// ── Single Bento Card ─────────────────────────────────────────────────────────
function BentoCard({
  feature,
  index,
}: {
  feature: BentoFeature;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: (index % 3) * 0.12, ease: "easeOut" }}
      className={`group relative p-6 flex flex-col gap-3 cursor-default transition-all duration-200 ${feature.colSpan ?? ""}`}
      style={{
        background: feature.accentBg,
        border: `1px solid ${feature.accent}18`,
        borderRadius: "4px",
      }}
      whileHover={{
        borderColor: `${feature.accent}45`,
        boxShadow: `0 0 32px -12px ${feature.accent}40`,
        transition: { duration: 0.2 },
      }}
    >
      {/* Protocol index label + category */}
      <div className="flex items-center gap-2">
        <span className="protocol-label">
          {String(index + 1).padStart(3, "0")} //
        </span>
        <span
          className="px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
          style={{ color: feature.accent, background: `${feature.accent}12`, borderRadius: "3px", border: `1px solid ${feature.accent}20` }}
        >
          {feature.label}
        </span>
      </div>

      {/* Icon + Title */}
      <div className="flex items-start gap-3">
        <div
          className="p-2.5 shrink-0 mt-0.5"
          style={{ background: `${feature.accent}10`, border: `1px solid ${feature.accent}22`, borderRadius: "4px" }}
        >
          <Icon className="w-5 h-5" style={{ color: feature.accent }} />
        </div>
        <h3 className="font-bold text-white text-base leading-snug mt-1 group-hover:text-opacity-100 transition-colors" style={{ letterSpacing: "-0.02em" }}>
          {feature.title}
        </h3>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm leading-relaxed pl-[52px] font-light">
        {feature.description}
      </p>

      {/* Optional mini-visual */}
      {feature.visual && <div className="pl-[52px]">{feature.visual}</div>}
    </motion.div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
      className="text-center space-y-3 mb-12"
    >
      {/* Protocol index label */}
      <div className="flex justify-center">
        <span className="protocol-label">002 // Feature Suite</span>
      </div>
      <h2 className="text-3xl sm:text-4xl font-black text-white" style={{ letterSpacing: "-0.03em" }}>
        Every Edge.{" "}
        <span
          style={{
            background: "linear-gradient(90deg, #0df2a4, #00d8f6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          One Terminal.
        </span>
      </h2>
      <p className="text-gray-500 text-sm font-mono max-w-xl mx-auto">
        An institutional-grade quantitative stack — from live funding arbitrage to
        cryptographic on-chain verification.
      </p>
    </motion.div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function BentoShowcase() {
  const features = useBentoFeatures();

  return (
    <section className="relative py-24 px-6 bg-[#06080D]">
      {/* Subtle top fade from hero */}
      <div className="absolute top-0 inset-x-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(180deg, #06080D 0%, transparent 100%)" }} />

      <div className="max-w-6xl mx-auto">
        <SectionHeader />

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <BentoCard key={feature.id} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
