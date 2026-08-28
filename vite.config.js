import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const buildEnv = loadEnv(mode, process.cwd(), "");
  const googleClientId = (
    buildEnv.VITE_GOOGLE_CLIENT_ID || buildEnv.GOOGLE_CLIENT_ID || ""
  ).trim();
  if (mode === "android" && !buildEnv.VITE_API_URL?.trim()) {
    throw new Error(
      "Android builds require VITE_API_URL. Set it to the Central Command LAN or HTTPS URL; phone loopback cannot reach the PC.",
    );
  }

  return {
    define: {
      "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(googleClientId),
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(mode === "android"
        ? []
        : [
            VitePWA({
              registerType: "autoUpdate",
              manifest: false,
              workbox: {
                globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
              },
              devOptions: {
                enabled: false,
              },
            }),
          ]),
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
  };
});
