import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Database tests against PGlite with PostGIS. Slower to start, so kept out of `npm test`.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: import.meta.dirname,
      include: ["supabase/tests/**/*.test.ts"],
      environment: "node",
      testTimeout: 120_000,
      hookTimeout: 120_000,
    },
  }),
);
