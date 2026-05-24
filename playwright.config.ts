import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [
    {
      name: "family-smoke",
      testDir: "./apps/family/tests/e2e",
      use: { ...devices["Pixel 5"], baseURL: process.env.FAMILY_URL ?? "http://localhost:5173" },
    },
    {
      name: "guard-smoke",
      testDir: "./apps/guard/tests/e2e",
      use: { ...devices["Pixel 5"], baseURL: process.env.GUARD_URL ?? "http://localhost:5174" },
    },
    {
      name: "cross-app",
      testDir: "./tests/e2e",
      testMatch: /cross-app/,
    },
  ],
});
