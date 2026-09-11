import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#06090e",
        foreground: "#f8fafc",
        tactical: {
          950: "#04060a",
          900: "#070b12",
          850: "#0b101b",
          800: "#101726",
          750: "#151f33",
          700: "#1c2842",
          600: "#27375a",
          500: "#3d517e",
          400: "#6076a5",
          300: "#94a3b8",
        },
        intel: {
          cyan: "#00f0ff",
          blue: "#0284c7",
          sky: "#38bdf8",
          glow: "rgba(0, 240, 255, 0.15)",
        },
        risk: {
          critical: "#ef4444",
          high: "#f97316",
          moderate: "#eab308",
          low: "#06b6d4",
          verified: "#10b981",
        },
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "pulse-subtle": "pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scanline 6s linear infinite",
        "radar-sweep": "radarSweep 4s linear infinite",
      },
      keyframes: {
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
        radarSweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      boxShadow: {
        "intel-glow": "0 0 25px -5px rgba(0, 240, 255, 0.25)",
        "alert-glow": "0 0 25px -5px rgba(239, 68, 68, 0.3)",
        "panel-dark": "0 10px 30px -10px rgba(0, 0, 0, 0.7)",
      },
    },
  },
  plugins: [],
};

export default config;
