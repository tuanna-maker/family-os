import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async (env) => {
  const resolvedViteConfig = typeof viteConfig === "function" ? await viteConfig(env) : viteConfig;

  return mergeConfig(
    resolvedViteConfig,
    defineConfig({
      test: {
      name: "family",
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setupTests.ts"],
      include: [
        "tests/unit/**/*.{test,spec}.{ts,tsx}",
        "tests/integration/**/*.{test,spec}.{ts,tsx}",
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "html"],
        reportsDirectory: "./tests/coverage",
        include: [
          "src/api/expenses.ts",
          "src/api/notifications.ts",
          "src/api/notification-prefs.ts",
          "src/api/scan-receipt.ts",
          "src/api/security.ts",
          "src/api/username.ts",
          "src/api/require-auth.ts",
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 48,
          statements: 80,
        },
      },
      env: {
        VITE_SUPABASE_URL: "https://test.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
      },
    },
    resolve: {
      alias: {
        "@shared/test-utils": path.resolve(dir, "../../packages/test-utils/src"),
      },
    },
  })
);
});
