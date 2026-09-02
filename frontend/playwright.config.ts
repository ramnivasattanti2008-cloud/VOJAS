import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for VOJAS.
 *
 * Run tests:
 *   npx playwright test          — headless (CI)
 *   npx playwright test --ui     — interactive UI mode
 *   npx playwright test --headed — headed (see the browser)
 *
 * Before running for the first time:
 *   npx playwright install chromium --with-deps
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Reuse the same browser context between tests (faster, simulates real user session)
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? [["github"], ["html"]] : [["html"]],

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Desktop Chromium (primary)
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Mobile viewport
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
