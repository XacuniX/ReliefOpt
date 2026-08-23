import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        globIgnores: [
          "**/map-vendor-*.js",
          "**/charts-vendor-*.js",
          "**/speech-vendor-*.js",
          "**/MapPage-*.js",
          "**/DashboardPage-*.js",
          "**/CargoPage-*.js",
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("@huggingface/transformers") ||
            id.includes("onnxruntime")
          )
            return "speech-vendor";
          if (id.includes("leaflet")) return "map-vendor";
          if (id.includes("recharts") || id.includes("d3-"))
            return "charts-vendor";
          if (id.includes("react") || id.includes("scheduler"))
            return "react-vendor";
          if (
            id.includes("@radix-ui") ||
            id.includes("framer-motion") ||
            id.includes("lucide-react")
          )
            return "ui-vendor";
        },
      },
    },
  },
});
