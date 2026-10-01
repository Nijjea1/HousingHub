import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Reuses the app's aliases. The database tests run separately with `npm run test:db`.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: import.meta.dirname,
      include: ["client/src/**/*.test.ts", "shared/**/*.test.ts"],
      environment: "node",
    },
  }),
);
