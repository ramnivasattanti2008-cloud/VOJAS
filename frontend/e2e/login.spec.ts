import { test, expect } from "@playwright/test";

/**
 * VOJAS — E2E login flow test.
 *
 * This test is intentionally minimal: it verifies the auth page renders,
 * a "demo login" affordance is present, and clicking it routes to the
 * authenticated dashboard. Extend with more flows as you add features.
 *
 * Assumes:
 *   - Frontend dev server running at http://localhost:5173
 *   - Backend reachable at the URL configured via VITE_API_URL
 *   - Demo seed user exists (per scripts/seed.ts)
 */

test.describe("VOJAS auth flow", () => {
  test("demo login → dashboard", async ({ page }) => {
    await page.goto("/login");

    // Auth page renders
    await expect(page).toHaveTitle(/VOJAS/i);

    // Find a demo / login button — selectors vary by implementation, so
    // we use a flexible match. Update the locator if the auth UI changes.
    const demoButton = page.getByRole("button", {
      name: /demo|login|sign in/i,
    }).first();

    await expect(demoButton).toBeVisible({ timeout: 10_000 });
    await demoButton.click();

    // Should land on a dashboard-style page (URL or heading)
    await expect(page).toHaveURL(/dashboard|home|projects/i, { timeout: 15_000 });
  });

  test("home page loads and shows VOJAS branding", async ({ page }) => {
    await page.goto("/");

    // Some content present — at least the title or hero
    await expect(page.locator("body")).toContainText(/VOJAS|MPLAD|accountability/i, {
      timeout: 10_000,
    });
  });
});
