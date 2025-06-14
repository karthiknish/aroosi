import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  // Extend timeout for slower CI builds
  test.setTimeout(60000);
  await page.goto("/");

  // Wait until main heading visible (page hydrated)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Title populated after hydration
  await expect(page).toHaveTitle(/Aroosi|Search/i, { timeout: 15000 });
});
