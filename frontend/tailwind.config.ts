import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#06080D", raised: "#0C1017", elevated: "#121722" },
        border: { subtle: "#1A2236", strong: "#283352" },
        hl: {
          green: "#4ADE80",
          cyan: "#22D3EE",
          blue: "#6366F1",
          amber: "#FBBF24",
          rose: "#F43F5E",
          violet: "#A78BFA",
        },
        synthro: {
          bg: "#080b11",
          card: "#0d131f",
          "card-hover": "#121a2b",
          border: "#1c283d",
          mint: "#0df2a4",
          cyan: "#00d8f6",
          muted: "#64748b",
        }
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jb-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(34, 211, 238, 0.15)",
        "glow-green": "0 0 24px -6px rgba(74, 222, 128, 0.2)",
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
