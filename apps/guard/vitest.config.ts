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
      name: "guard",
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setupTests.ts"],
      include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "html"],
        reportsDirectory: "./tests/coverage",
        include: [
          "src/api/security.ts",
          "src/api/require-auth.ts",
          "src/api/username.ts",
        ],
        exclude: ["**/*.d.ts", "tests/**"],
        thresholds: {
          lines: 74,
          functions: 60,
          branches: 38,
          statements: 74,
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
