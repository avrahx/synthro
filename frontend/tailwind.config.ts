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
          bg: "#08141f",
          card: "#12252e",
          "card-hover": "#0f636e",
          border: "#1a879f",
          mint: "#4debd6",
          cyan: "#21cfb3",
          muted: "#6c7c94",
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
