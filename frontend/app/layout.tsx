import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb-mono" });

export const metadata: Metadata = {
  title: "Synthro — HyperVault Alpha Engine",
  description:
    "Institutional quantitative framework for Hyperliquid L1: intra-L1 basis arbitrage, 1-hour funding harvesting, and native User Vault simulation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${outfit.variable} ${jbMono.variable}`}>
      <body className="min-h-screen flex flex-col selection:bg-synthro-cyan selection:text-black relative font-sans">
        {/* Background Grid */}
        <div className="fixed inset-0 z-[-2] bg-grid-pattern opacity-50 mix-blend-overlay pointer-events-none" />
        
        {/* Noise Texture */}
        <div className="fixed inset-0 z-[-1] bg-noise opacity-[0.03] pointer-events-none mix-blend-screen" />
        
        {/* Top Right Cyan Glow */}
        <div className="fixed top-0 right-0 z-[-1] w-[600px] h-[600px] bg-[rgba(0,216,246,0.07)] rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        
        {/* Bottom Left Mint Glow */}
        <div className="fixed bottom-0 left-0 z-[-1] w-[600px] h-[600px] bg-[rgba(13,242,164,0.06)] rounded-full blur-[140px] pointer-events-none transform -translate-x-1/3 translate-y-1/3" />
        
        <div className="flex-grow z-10 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
