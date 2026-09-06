"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";

// Dynamic import prevents Three.js from running on the server
const Hero3DCanvas = dynamic(
  () => import("./Hero3DCanvas").then((m) => ({ default: m.Hero3DCanvas })),
  { ssr: false }
);

const STAT_ITEMS = [
  { label: "Annualized Alpha", value: "+34.2%", color: "text-[#0df2a4]" },
  { label: "Sharpe Ratio",     value: "4.81",   color: "text-[#00d8f6]" },
  { label: "Max Drawdown",     value: "-2.3%",  color: "text-[#a78bfa]" },
  { label: "Win Rate",         value: "91.4%",  color: "text-[#0df2a4]" },
];

const PILL_ITEMS = [
  { icon: Zap,        label: "HyperCore L1 Engine" },
  { icon: Shield,     label: "Delta-Neutral" },
  { icon: TrendingUp, label: "Live Funding Harvest" },
];

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#06080D]">
      {/* Three.js Canvas background */}
      <Hero3DCanvas />

      {/* Radial vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, #06080D 100%)",
        }}
      />

      {/* Top mint glow — very subtle */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(13,242,164,0.07) 0%, transparent 70%)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 gap-8 max-w-5xl mx-auto">

        {/* Protocol index label */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="protocol-label">001 // Quantitative Basis Engine</span>
        </motion.div>

        {/* Top tag row — industrial sharp edges */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {PILL_ITEMS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest"
              style={{
                background: "rgba(13,242,164,0.04)",
                border: "1px solid rgba(13,242,164,0.2)",
                borderRadius: "4px",
                color: "rgba(13,242,164,0.8)",
                letterSpacing: "0.1em",
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </span>
          ))}
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="space-y-3"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05]" style={{ letterSpacing: "-0.03em" }}>
            <span className="text-white">The Quantitative </span>
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #0df2a4 0%, #00d8f6 50%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              HyperVault Engine
            </span>
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Institutional-grade intra-L1 basis arbitrage &amp; funding rate harvesting on{" "}
            <span className="text-white font-semibold">Hyperliquid</span>.
            Delta-neutral. On-chain verifiable. Machine-learning guided.
          </p>
        </motion.div>

        {/* Floating mockup card — hard edges */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 6 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
          className="w-full max-w-2xl"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(13,242,164,0.04) 0%, rgba(0,216,246,0.03) 50%, rgba(10,14,22,0.95) 100%)",
              border: "1px solid rgba(13,242,164,0.18)",
              borderRadius: "4px",
              boxShadow: "0 0 60px -20px rgba(13,242,164,0.2), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Mockup header bar */}
            <div
              className="flex items-center gap-1.5 px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="w-2 h-2 rounded-sm bg-[#F43F5E]/60" />
              <div className="w-2 h-2 rounded-sm bg-[#FBBF24]/60" />
              <div className="w-2 h-2 rounded-sm bg-[#0df2a4]/60" />
              <div className="ml-2 flex-1 h-4 flex items-center px-2"
                style={{ background: "rgba(255,255,255,0.04)", borderRadius: "2px" }}>
                <span className="font-mono text-[10px] text-gray-500">app.synthro.finance — HYPERCORE L1</span>
              </div>
              <div className="w-2 h-2 bg-[#0df2a4] animate-pulse" style={{ borderRadius: "2px" }} />
            </div>

            {/* Mockup stats grid */}
            <div className="grid grid-cols-4 gap-px" style={{ background: "rgba(255,255,255,0.04)" }}>
              {STAT_ITEMS.map(({ label, value, color }) => (
                <div key={label} className="bg-[#08101a] p-4 flex flex-col gap-1">
                  <span className={`font-mono text-lg font-black ${color}`}>{value}</span>
                  <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>

            {/* Fake chart bars */}
            <div className="px-4 pb-4 pt-3">
              <div className="flex items-end gap-1 h-16">
                {[0.3, 0.5, 0.45, 0.7, 0.6, 0.8, 0.75, 0.9, 0.85, 0.95, 0.88, 1, 0.97, 0.99].map(
                  (h, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.5 + i * 0.04, duration: 0.4, ease: "easeOut" }}
                      style={{ originY: 1, height: `${h * 100}%` }}
                      className="flex-1"
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          background: `linear-gradient(180deg, ${i % 2 === 0 ? "#0df2a4" : "#00d8f6"}66 0%, ${i % 2 === 0 ? "#0df2a4" : "#00d8f6"}22 100%)`,
                          borderRadius: "2px 2px 0 0",
                        }}
                      />
                    </motion.div>
                  )
                )}
              </div>
              <div className="mt-1 font-mono text-[9px] text-gray-600 flex justify-between">
                <span>JUN 2024</span>
                <span className="text-[#0df2a4]">EQUITY CURVE ↑ LIVE</span>
                <span>DEC 2024</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* CTA row — protocol buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <Link href="/terminal" className="btn-protocol-primary">
            Launch Terminal
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="https://github.com/avrahx/synthro"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-protocol-secondary"
          >
            View on GitHub
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="flex flex-col items-center gap-1.5 mt-4"
        >
          <span className="protocol-label">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-[#0df2a4]/40 to-transparent"
          />
        </motion.div>
      </div>
    </section>
  );
}
