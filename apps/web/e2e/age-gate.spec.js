import { test, expect } from "@playwright/test";

test("profile wizard blocks under-18 date of birth", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/create-profile");

  // Wait until the create-profile hero heading appears (page hydrated)
  await expect(
    page.getByRole("heading", { name: /create your profile/i })
  ).toBeVisible({ timeout: 15000 });

  // Fill required full name field (input has placeholder or label)
  const nameInput = page.getByLabel(/full name/i).first();
  await nameInput.fill("Test Teen");

  // Open the DOB picker (button contains a calendar icon)
  const dobButton = page.getByRole("button", { name: /pick a date/i });
  await dobButton.click();

  // Compute a date 17 years ago
  const today = new Date();
  const targetYear = today.getFullYear() - 17;
  const targetMonth = today.getMonth() + 1; // 1-indexed

  // Change year dropdown – pick the first select and choose year
  const yearSelect = page.locator('[aria-label^="Year"]');
  await yearSelect.waitFor({ state: "visible" });
  await yearSelect.selectOption(String(targetYear));

  // Choose month dropdown if present
  const monthSelect = page.locator('[aria-label^="Month"]');
  if (await monthSelect.count()) {
    await monthSelect.selectOption(String(targetMonth));
  }

  // Pick day 1
  await page.locator(".rdp-day", { hasText: "1" }).first().click();

  // Click Next
  await page.getByRole("button", { name: /next/i }).click();

  // Expect still on step 1
  await expect(page.locator("text=/Step 1 of/i")).toBeVisible();

  // Toast error about age
  await expect(page.getByRole("alert")).toContainText(/18/i);

  // DOB invalid attr
  await expect(dobButton).toHaveAttribute("aria-invalid", "true");
});
