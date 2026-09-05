"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";

// Dynamic import prevents Three.js from running on the server
const Hero3DCanvas = dynamic(
  () => import("./Hero3DCanvas").then((m) => ({ default: m.Hero3DCanvas })),
  { ssr: false }
);

interface LandingHeroProps {
  onLaunch: () => void;
}

const STAT_ITEMS = [
  { label: "Annualized Alpha", value: "+34.2%", color: "text-[#0df2a4]" },
  { label: "Sharpe Ratio", value: "4.81", color: "text-[#00d8f6]" },
  { label: "Max Drawdown", value: "-2.3%", color: "text-[#a78bfa]" },
  { label: "Win Rate", value: "91.4%", color: "text-[#0df2a4]" },
];

const PILL_ITEMS = [
  { icon: Zap, label: "HyperCore L1 Engine" },
  { icon: Shield, label: "Delta-Neutral" },
  { icon: TrendingUp, label: "Live Funding Harvest" },
];

export function LandingHero({ onLaunch }: LandingHeroProps) {
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

      {/* Top mint glow blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(13,242,164,0.1) 0%, transparent 70%)" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 gap-8 max-w-5xl mx-auto">

        {/* Top badge row */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {PILL_ITEMS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#0df2a4]/30 bg-[#0df2a4]/5 text-[#0df2a4] font-mono text-xs font-semibold backdrop-blur-sm"
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
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
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

        {/* Floating mockup card */}
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
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(13,242,164,0.06) 0%, rgba(0,216,246,0.04) 50%, rgba(18,23,34,0.9) 100%)",
              border: "1px solid rgba(13,242,164,0.2)",
              boxShadow: "0 0 80px -20px rgba(13,242,164,0.25), 0 0 40px -10px rgba(0,216,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Mockup header bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#0df2a4]/70" />
              <div className="ml-2 flex-1 rounded bg-white/5 h-4 flex items-center px-2">
                <span className="font-mono text-[10px] text-gray-500">app.synthro.finance — HYPERCORE L1</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#0df2a4] animate-pulse" />
            </div>

            {/* Mockup stats grid */}
            <div className="grid grid-cols-4 gap-px bg-white/5 p-px">
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
                      className="flex-1 rounded-t"
                    >
                      <div
                        className="w-full h-full rounded-t"
                        style={{
                          background: `linear-gradient(180deg, ${i % 2 === 0 ? "#0df2a4" : "#00d8f6"}66 0%, ${i % 2 === 0 ? "#0df2a4" : "#00d8f6"}22 100%)`,
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

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <button
            onClick={onLaunch}
            className="group flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm font-mono transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #0df2a4 0%, #00d8f6 100%)",
              color: "#06080D",
              boxShadow: "0 0 30px -6px rgba(13,242,164,0.5)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 50px -6px rgba(13,242,164,0.7)";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 30px -6px rgba(13,242,164,0.5)";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            Launch Terminal
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>

          <a
            href="https://github.com/avrahx/synthro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-4 rounded-xl font-mono text-sm font-semibold text-gray-400 border border-white/10 hover:border-white/25 hover:text-white transition-all duration-300 backdrop-blur-sm"
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
          <span className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.2em]">Scroll to explore</span>
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
