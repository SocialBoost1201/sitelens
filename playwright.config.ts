// Playwright Test configuration — SiteLens
// Docs: https://playwright.dev/docs/test-configuration

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  // Run tests in parallel across workers
  fullyParallel: true,
  // Fail the build if any test.only() is left committed
  forbidOnly: !!process.env.CI,
  // Retry once on CI for flakiness tolerance
  retries: process.env.CI ? 1 : 0,
  // Limit parallel workers on CI to avoid resource contention
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],

  use: {
    baseURL: BASE_URL,
    // Capture trace on first retry to ease debugging
    trace: "on-first-retry",
    // Capture screenshot on failure
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Uncomment to expand browser coverage:
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit",  use: { ...devices["Desktop Safari"] } },
  ],

  // Automatically start the Next.js dev server before tests run locally.
  // On CI, start the production build instead.
  webServer: {
    command: process.env.CI
      ? "PATH=\"/opt/homebrew/bin:$PATH\" npm run start"
      : "PATH=\"/opt/homebrew/bin:$PATH\" npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
