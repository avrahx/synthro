"use client";

import Link from "next/link";
import { LandingHero } from "../components/LandingHero";
import { BentoShowcase } from "../components/BentoShowcase";

export default function HomePage() {
  return (
    <main>
      <LandingHero />
      <BentoShowcase />

      {/* ── Footer CTA ──────────────────────────────────────────────────── */}
      <section className="bg-[#06080D] py-20 px-6 flex flex-col items-center gap-6">
        {/* Glowing divider */}
        <div
          className="w-px h-16"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(13,242,164,0.5), transparent)",
          }}
        />

        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Ready to trade{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #0df2a4, #00d8f6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              delta-neutral?
            </span>
          </h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Open the full quantitative terminal — live funding matrix, backtester,
            wallet audit, and execution engine.
          </p>
        </div>

        <Link
          href="/terminal"
          className="flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-sm font-mono transition-all duration-300 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #0df2a4 0%, #00d8f6 100%)",
            color: "#06080D",
            boxShadow: "0 0 40px -8px rgba(13,242,164,0.5)",
          }}
        >
          Launch Terminal →
        </Link>

        {/* Footer links */}
        <div className="flex items-center gap-6 pt-8 font-mono text-xs text-gray-600">
          <a
            href="https://github.com/avrahx/synthro"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition-colors"
          >
            GitHub
          </a>
          <span className="text-gray-800">·</span>
          <a
            href="https://hyperliquid.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition-colors"
          >
            Hyperliquid L1
          </a>
          <span className="text-gray-800">·</span>
          <span className="text-gray-700">© 2024 Synthro</span>
        </div>
      </section>
    </main>
  );
}
