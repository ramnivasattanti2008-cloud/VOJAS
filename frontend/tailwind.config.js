/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // VOJAS brand palette - dark government intelligence aesthetic
        navy: {
          50: "#f0f3f8",
          100: "#d9e0ec",
          200: "#b3c1d8",
          300: "#8da2c5",
          400: "#6783b1",
          500: "#41649e",
          600: "#344e7c",
          700: "#283a5d",
          800: "#1c263e",
          900: "#10151f",
          950: "#080b10",
        },
        electric: {
          400: "#3b82f6",
          500: "#2563eb",
          600: "#1d4ed8",
        },
        saffron: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
