/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // ── Void scale (dark mode surfaces) ──
        void: {
          0:    "#04060a",
          50:   "#070a10",
          100:  "#0a0e18",
          200:  "#10141f",
          300:  "#161b2a",
          400:  "#1c2236",
          500:  "#252c44",
          600:  "#2e3652",
          700:  "#3a4361",
          800:  "#4a5374",
          900:  "#6c7595",
          950:  "#9ba3bf",
        },
        // ── Paper scale (light mode surfaces) ──
        paper: {
          0:    "#ffffff",
          50:   "#fafbfc",
          100:  "#f4f6f9",
          200:  "#eef1f6",
          300:  "#e3e8f0",
          400:  "#d0d7e3",
          500:  "#b6bfd0",
          600:  "#8b95ad",
          700:  "#5d6679",
          800:  "#3d4456",
          900:  "#1f2433",
        },
        // ── Brand: electric (primary accent) ──
        electric: {
          200:  "#bfdbfe",
          300:  "#60a5fa",
          400:  "#3b82f6",
          500:  "#2563eb",
          600:  "#1d4ed8",
          700:  "#1e40af",
        },
        // ── Brand: saffron (highlight) ──
        saffron: {
          300:  "#fcd34d",
          400:  "#fbbf24",
          500:  "#f59e0b",
          600:  "#d97706",
        },
        // ── Semantic status ──
        success: {
          400:  "#22c55e",
          500:  "#16a34a",
        },
        warning: {
          400:  "#f59e0b",
          500:  "#d97706",
        },
        danger: {
          400:  "#ef4444",
          500:  "#dc2626",
        },
        info: {
          400:  "#06b6d4",
          500:  "#0891b2",
        },
        // ── Legacy aliases (kept for backward compat) ──
        navy: {
          50:  "#f0f3f8",
          100: "#d9e0ec",
          200: "#b3c1d8",
          300: "#8da2c5",
          400: "#6783b1",
          500: "#41649e",
          600: "#344e7c",
          700: "#283a5d",
          800: "#1c263e",
          850: "#141d30",
          900: "#10151f",
          950: "#080b10",
        },
        status: {
          green:  "#22c55e",
          amber:  "#f59e0b",
          red:    "#ef4444",
          blue:   "#3b82f6",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        sans:  ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono:  ["JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
        serif: ["Playfair Display", "Georgia", "serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "7xl":  ["4.5rem",  { lineHeight: "1" }],
        "8xl":  ["6rem",    { lineHeight: "1" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "88": "22rem",
        "128": "32rem",
      },
      borderRadius: {
        // Custom radius scale (binding)
        "xs":  "4px",
        "sm":  "6px",
        "md":  "10px",
        "lg":  "14px",
        "xl":  "20px",
        "2xl": "28px",
      },
      boxShadow: {
        // Elevation scale
        "elev-1": "0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px rgba(37,42,68,0.5)",
        "elev-2": "0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(46,54,82,0.6)",
        "elev-3": "0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(58,67,97,0.7)",
        "elev-4": "0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(58,67,97,0.7)",
        // Glow shadows (for emphasized cards)
        "glow-sm":   "0 0 12px rgba(59, 130, 246, 0.25)",
        "glow":      "0 0 24px rgba(59, 130, 246, 0.35)",
        "glow-lg":   "0 0 48px rgba(59, 130, 246, 0.45)",
        "glow-xl":   "0 0 80px rgba(59, 130, 246, 0.55)",
        "glow-saffron": "0 0 24px rgba(245, 158, 11, 0.35)",
        "glow-success": "0 0 24px rgba(34, 197, 94, 0.30)",
        "glow-warning": "0 0 24px rgba(245, 158, 11, 0.30)",
        "glow-danger":  "0 0 24px rgba(239, 68, 68, 0.30)",
        "glow-info":    "0 0 24px rgba(6, 182, 212, 0.30)",
        // General
        "card":    "0 4px 24px rgba(0, 0, 0, 0.4)",
        "card-lg": "0 8px 48px rgba(0, 0, 0, 0.5)",
        "inner-glow": "inset 0 0 20px rgba(59, 130, 246, 0.05)",
      },
      animation: {
        "fade-in":        "fadeIn 0.4s ease-out",
        "fade-in-up":     "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in-scale":  "fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left":  "slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "float":          "float 6s ease-in-out infinite",
        "float-slow":     "float 9s ease-in-out infinite reverse",
        "pulse-glow":     "pulseGlow 2.5s ease-in-out infinite",
        "orbit":          "orbit 20s linear infinite",
        "spin-slow":      "spin 12s linear infinite",
        "shimmer":        "shimmer 2s linear infinite",
        "ping-slow":      "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "bounce-in":      "bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "blur-in":        "blurIn 0.5s ease-out",
        "marquee":        "marquee 30s linear infinite",
        // New for spatial design
        "pulse-soft":     "pulseSoft 2s ease-in-out infinite",
        "marker-pulse":   "markerPulse 2s ease-in-out infinite",
        "from-depth":     "fromDepth 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeInScale: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(30px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-30px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-12px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%":       { opacity: "0.8", transform: "scale(1.05)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.7" },
          "50%":       { opacity: "1" },
        },
        markerPulse: {
          "0%, 100%": { transform: "scale(1)",   opacity: "0.9" },
          "50%":       { transform: "scale(1.3)", opacity: "0.5" },
        },
        fromDepth: {
          from: { opacity: "0", transform: "translateY(12px) scale(0.97)", filter: "blur(8px)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)",      filter: "blur(0)" },
        },
        orbit: {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
        bounceIn: {
          from: { opacity: "0", transform: "scale(0.3)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        blurIn: {
          from: { opacity: "0", filter: "blur(12px)" },
          to:   { opacity: "1", filter: "blur(0px)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      transitionTimingFunction: {
        "spring":   "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "smooth":   "cubic-bezier(0.16, 1, 0.3, 1)",
        "spatial":  "cubic-bezier(0.34, 1.2, 0.64, 1)",
        "data":     "cubic-bezier(0.4, 0, 0.2, 1)",
        "in-out":   "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        "0":   "0ms",
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
        "400": "400ms",
        "800": "800ms",
        "1500": "1500ms",
      },
      // Spatial / perspective utilities
      perspective: {
        "500": "500px",
        "1000": "1000px",
        "2000": "2000px",
      },
      transformStyle: {
        "3d": "preserve-3d",
      },
      // Grid pattern for backgrounds
      backgroundImage: {
        "grid-pattern":     "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "grid-pattern-sm":  "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
        "noise":            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
        "gradient-radial":  "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":   "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      backgroundSize: {
        "grid":     "40px 40px",
        "grid-sm":  "20px 20px",
        "noise":    "200px 200px",
      },
    },
  },
  plugins: [],
};
