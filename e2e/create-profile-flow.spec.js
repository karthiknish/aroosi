import { test, expect } from "@playwright/test";

// Credentials are provided via env vars for security (see README / CI secrets)
const EMAIL = process.env.E2E_USER_EMAIL || "test@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD || "Testcreator";

// Helper to complete Clerk sign-in UI
async function signIn(page) {
  await page.goto("/sign-in");

  // Fill email then press Enter to submit step immediately
  const emailInput = page.getByLabel(/email/i);
  await emailInput.fill(EMAIL);
  await emailInput.press("Enter");

  // Fill password
  const pwdInput = page.getByLabel(/password/i);
  await pwdInput.fill(PASSWORD);

  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait until redirected (profile incomplete will redirect to /create-profile)
  await page.waitForURL(/create-profile|search/i, { timeout: 15000 });
}

test.describe("Create profile end-to-end (live Convex)", () => {
  test("completes the wizard and lands on /search", async ({ page }) => {
    test.setTimeout(120_000);

    await signIn(page);

    // If already completed, just assert redirect works
    if (page.url().includes("/search")) {
      await expect(page).toHaveURL(/search/);
      return;
    }

    // STEP 1 – basic info
    await page.getByLabel(/full name/i).fill("E2E Test User");

    // DOB picker – set 25yrs ago on Jan 1
    await page.getByRole("button", { name: /pick a date/i }).click();
    const yearSelect = page.locator('[aria-label^="Year"]');
    await yearSelect.waitFor({ state: "visible" });
    const targetYear = new Date().getFullYear() - 25;
    await yearSelect.selectOption(String(targetYear));
    const monthSelect = page.locator('[aria-label^="Month"]');
    if (await monthSelect.count()) {
      await monthSelect.selectOption("1"); // January
    }
    await page.locator(".rdp-day", { hasText: "1" }).first().click();

    // Height slider: press ArrowRight a bit
    const slider = page.getByRole("slider");
    await slider.focus();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowRight");
    }

    await page.getByRole("button", { name: /next/i }).click();

    // STEP 2 – education & job (fill minimal)
    await page.getByLabel(/education/i).fill("BSc");
    await page.getByLabel(/occupation/i).fill("Tester");
    await page.getByRole("button", { name: /next/i }).click();

    // STEP 3 – about me & submit
    await page
      .getByLabel(/about me/i)
      .fill("E2E profile created via Playwright tests.");
    await page.getByRole("button", { name: /finish|submit/i }).click();

    // Expect redirect to /search with success toast
    await page.waitForURL(/search/);
    await expect(page).toHaveURL(/search/);
  });
});
