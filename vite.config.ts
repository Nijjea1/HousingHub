import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
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
        // A function rather than a list, so the server build (where React is external) can share this config.
        manualChunks(id) {
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor";
        },
      },
    },
  },
});
