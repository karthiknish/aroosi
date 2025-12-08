import { test, expect } from "@playwright/test";

test("wizard advances to step 2 with valid basic info", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/create-profile");

  await expect(
    page.getByRole("heading", { name: /create your profile/i })
  ).toBeVisible({ timeout: 15000 });

  // Fill name
  await page
    .getByLabel(/full name/i)
    .first()
    .fill("Happy Adult");

  // Open DOB picker & choose age 25
  const dobButton = page.getByRole("button", { name: /pick a date/i });
  await dobButton.click();

  const today = new Date();
  const targetYear = today.getFullYear() - 25;
  const targetMonth = 1; // January for simplicity

  const yearSelect = page.locator('[aria-label^="Year"]');
  await yearSelect.waitFor({ state: "visible" });
  await yearSelect.selectOption(String(targetYear));
  const monthSelect = page.locator('[aria-label^="Month"]');
  if (await monthSelect.count()) {
    await monthSelect.selectOption(String(targetMonth));
  }
  await page.locator(".rdp-day", { hasText: "1" }).first().click();

  // Move height slider roughly to middle by pressing ArrowRight a few times on slider (role="slider")
  const slider = page.getByRole("slider");
  await slider.focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("ArrowRight");
  }

  // Click Next
  await page.getByRole("button", { name: /next/i }).click();

  // Expect Step 2 now visible
  await expect(page.locator("text=/Step 2 of/i")).toBeVisible();
});
