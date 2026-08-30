import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Vite dev server proxies /api/* to the backend.
    // In production (Vercel), set VITE_API_BASE_URL to point to the
    // deployed backend instead (e.g. https://vojas-backend.onrender.com/api/v1).
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split large dependencies into separate chunks for better caching
        // and faster initial load.
        manualChunks: {
          "vendor-react": [
            "react",
            "react-dom",
            "react-router-dom",
          ],
          "vendor-leaflet": [
            "leaflet",
            "react-leaflet",
          ],
          "vendor-icons": [
            "lucide-react",
          ],
        },
        // Stable file naming for long-term caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    // Leaflet+react-leaflet is heavy; bump warning threshold to avoid noise
    chunkSizeWarningLimit: 700,
  },
});
