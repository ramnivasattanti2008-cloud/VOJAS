/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // VOJAS brand palette — dark government intelligence aesthetic
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
        electric: {
          300: "#60a5fa",
          400: "#3b82f6",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
        },
        saffron: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        // Status semantic colors
        status: {
          green:  "#22c55e",
          amber:  "#f59e0b",
          red:    "#ef4444",
          blue:   "#3b82f6",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        sans:  ["Inter", "system-ui", "sans-serif"],
        mono:  ["JetBrains Mono", "monospace"],
        serif: ["Playfair Display", "Georgia", "serif"],
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
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "glow-sm":  "0 0 12px rgba(37, 99, 235, 0.25)",
        "glow":     "0 0 24px rgba(37, 99, 235, 0.35)",
        "glow-lg":  "0 0 48px rgba(37, 99, 235, 0.45)",
        "glow-xl":  "0 0 80px rgba(37, 99, 235, 0.55)",
        "glow-saffron": "0 0 24px rgba(245, 158, 11, 0.35)",
        "glow-green":  "0 0 24px rgba(34, 197, 94, 0.35)",
        "glow-red":    "0 0 24px rgba(239, 68, 68, 0.35)",
        "card":    "0 4px 24px rgba(0, 0, 0, 0.4)",
        "card-lg": "0 8px 48px rgba(0, 0, 0, 0.5)",
        "inner-glow": "inset 0 0 20px rgba(37, 99, 235, 0.05)",
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
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "smooth": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      // Spatial / perspective utilities
      perspective: {
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
