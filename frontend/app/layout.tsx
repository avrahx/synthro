import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Outfit } from "next/font/google";
import { TickerBar } from "../components/TickerBar";
import { Navbar } from "../components/Navbar";
import { Web3Provider } from "../components/Web3Provider";
import "./globals.css";

// ── Typography ────────────────────────────────────────────────────────────────
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jb-mono",
  display: "swap",
});

// Kept for backward compatibility with any var(--font-outfit) references
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

// ── SEO ───────────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Synthro — HyperVault Alpha | Hyperliquid L1 Quantitative Engine",
  description:
    "Institutional quantitative framework for Hyperliquid L1: intra-L1 basis arbitrage, 1-hour funding harvesting, delta-neutral vault simulation, and on-chain audit trail.",
  keywords: [
    "Hyperliquid", "L1", "basis arbitrage", "funding rate", "delta neutral",
    "crypto quant", "DeFi vault", "ERC-4626", "perpetuals",
  ],
  openGraph: {
    title: "Synthro — HyperVault Alpha",
    description: "Institutional quant framework for Hyperliquid L1 basis arbitrage.",
    siteName: "Synthro",
    locale: "en_US",
    type: "website",
  },
};

// ── Layout ────────────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${plusJakarta.variable} ${jbMono.variable} ${outfit.variable}`}
    >
      <body
        className="min-h-screen flex flex-col relative antialiased"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <Web3Provider>
          {/* ── Shared Ambient Layers ───────────────────────────────────────── */}

          {/* Obsidian base fill */}
          <div className="fixed inset-0 z-[-3] bg-[#07090e]" />

          {/* Radial glow — top-left mint */}
          <div
            className="fixed z-[-2] pointer-events-none"
            style={{
              top: "-10%",
              left: "-5%",
              width: "55vw",
              height: "55vw",
              maxWidth: "800px",
              maxHeight: "800px",
              background: "radial-gradient(circle, rgba(13,242,164,0.055) 0%, transparent 60%)",
            }}
          />

          {/* Radial glow — bottom-right cyan */}
          <div
            className="fixed z-[-2] pointer-events-none"
            style={{
              bottom: "-10%",
              right: "-5%",
              width: "55vw",
              height: "55vw",
              maxWidth: "800px",
              maxHeight: "800px",
              background: "radial-gradient(circle, rgba(0,216,246,0.04) 0%, transparent 60%)",
            }}
          />

          {/* Micro grid overlay */}
          <div
            className="fixed inset-0 z-[-1] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), " +
                "linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Noise film */}
          <div className="fixed inset-0 z-[-1] bg-noise opacity-[0.025] pointer-events-none mix-blend-screen" />

          {/* ── App Shell ──────────────────────────────────────────────────── */}
          <div className="relative z-10 flex flex-col min-h-screen">
            <TickerBar />
            <Navbar />
            <div className="flex-1">
              {children}
            </div>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
