// Smoke test — root page
// Verifies that the app starts and renders the expected foundation content.
// This is intentionally minimal — expand as real pages are built.

import { expect, test } from "@playwright/test";

test.describe("Root page", () => {
  test("renders the SiteLens heading", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/SiteLens/i);
    await expect(
      page.getByRole("heading", { name: /SiteLens/i }),
    ).toBeVisible();
  });

  test("shows foundation status message", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText(/foundation\s*\/\s*setup phase/i),
    ).toBeVisible();
  });
});
