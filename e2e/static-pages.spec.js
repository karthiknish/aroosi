import { test, expect } from "@playwright/test";

// List of public routes and a regex we expect to find on the page to confirm load
const routes = ["/", "/about", "/how-it-works", "/pricing", "/faq"];

test.describe("Public static pages render", () => {
  for (const path of routes) {
    test(`page ${path} renders page heading`, async ({ page }) => {
      test.setTimeout(60000);
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`), {
        timeout: 15000,
      });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
});
