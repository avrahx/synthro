import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synthro — HyperVault Alpha Engine",
  description:
    "Institutional quantitative framework for Hyperliquid L1: intra-L1 basis arbitrage, 1-hour funding harvesting, and native User Vault simulation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col selection:bg-hl-cyan selection:text-black">
        {children}
      </body>
    </html>
  );
}
