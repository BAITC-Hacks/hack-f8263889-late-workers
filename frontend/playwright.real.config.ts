import { defineConfig, devices } from "@playwright/test";

import { API_TARGET } from "./e2e/real/helpers";

/**
 * Acceptance against a running FastAPI with the demo seed. Mock-free: Vite
 * proxies /api to API_PROXY_TARGET. Tests register fresh accounts, so point
 * it at a disposable database.
 */
export default defineConfig({
  testDir: "./e2e/real",
  globalSetup: "./e2e/real/global-setup.ts",
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: "test-results-real",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report-real" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5181",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5181 --strictPort",
    url: "http://127.0.0.1:5181",
    env: { AUTH_MOCKS: "false", API_PROXY_TARGET: API_TARGET },
    reuseExistingServer: false,
  },
});
