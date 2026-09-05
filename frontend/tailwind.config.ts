import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Canvas / Surface ───────────────────────────────────────────────
        bg: {
          DEFAULT: "#07090e",       // Obsidian depth
          raised:  "#0d1117",       // Card layer
          elevated: "#141b27",      // Elevated element
        },
        border: {
          subtle: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.12)",
          mint:   "rgba(13,242,164,0.25)",
          cyan:   "rgba(0,216,246,0.25)",
        },
        // ── HL Semantic Colors ─────────────────────────────────────────────
        hl: {
          green:  "#4ADE80",
          cyan:   "#22D3EE",
          blue:   "#6366F1",
          amber:  "#FBBF24",
          rose:   "#f43f5e",        // Coral Red
          violet: "#A78BFA",
          mint:   "#0df2a4",        // Electric Mint alias
        },
        // ── Synthro Brand Tokens ───────────────────────────────────────────
        synthro: {
          bg:         "#07090e",
          card:       "#0d1420",
          "card-hover": "#111e32",
          border:     "rgba(255,255,255,0.07)",
          mint:       "#0df2a4",    // Electric Mint
          cyan:       "#00d8f6",    // Electric Cyan
          coral:      "#f43f5e",    // Coral Red
          muted:      "#5a6a82",
        },
      },

      fontFamily: {
        // Plus Jakarta Sans — headers, labels, badges
        sans: [
          "Plus Jakarta Sans",
          "var(--font-plus-jakarta)",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        // JetBrains Mono — tabular numerics, code, terminal
        mono: [
          "JetBrains Mono",
          "var(--font-jb-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
        // Outfit — legacy alias kept for backward compat
        outfit: ["var(--font-outfit)", "Inter", "sans-serif"],
      },

      backgroundImage: {
        // Card surface gradient
        "card-surface":
          "linear-gradient(145deg, rgba(13,19,32,0.7) 0%, rgba(8,11,18,0.85) 100%)",
        // Brand gradient
        "brand-gradient":
          "linear-gradient(135deg, #0df2a4 0%, #00d8f6 100%)",
        // Subtle gradient for inactive areas
        "subtle-gradient":
          "linear-gradient(180deg, rgba(13,242,164,0.03) 0%, transparent 100%)",
      },

      boxShadow: {
        glow:          "0 0 24px -6px rgba(0,216,246,0.2)",
        "glow-mint":   "0 0 24px -6px rgba(13,242,164,0.3)",
        "glow-green":  "0 0 24px -6px rgba(74,222,128,0.2)",
        "glow-coral":  "0 0 24px -6px rgba(244,63,94,0.3)",
        "card-ambient":"0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)",
        "panel":       "0 4px 24px rgba(0,0,0,0.35)",
        "inset-glow":  "inset 0 1px 0 rgba(255,255,255,0.06)",
      },

      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },

      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.5" },
        },
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 12px -3px rgba(13,242,164,0.3)" },
          "50%":       { boxShadow: "0 0 24px -3px rgba(13,242,164,0.6)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },

      animation: {
        "pulse-subtle": "pulse-subtle 2.5s ease-in-out infinite",
        "fade-in-up":   "fade-in-up 0.4s ease-out both",
        "glow-pulse":   "glow-pulse 3s ease-in-out infinite",
        "shimmer":      "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
