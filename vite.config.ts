import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Demo mode (see client/src/demo): on for builds on Vercel, where no hosted database exists, unless
// VITE_DEMO_MODE says otherwise. Local runs and tests stay on the real backend.
const demoMode = process.env.VITE_DEMO_MODE ?? (process.env.VERCEL ? "true" : "false");

export default defineConfig({
  define: {
    "import.meta.env.VITE_DEMO_MODE": JSON.stringify(demoMode),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "client/src"),
      "@shared": resolve(import.meta.dirname, "shared"),
      "@assets": resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: resolve(import.meta.dirname, "client"),
  base: "/",
  build: {
    outDir: resolve(import.meta.dirname, "client/dist"),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
});
