import { test, expect } from "@playwright/test";
import path from "path";

// Credentials come from env for CI / local runs
const EMAIL = process.env.E2E_USER_EMAIL || "test@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD || "Testcreator";

/**
 * Re-usable helper that signs any user into Clerk.
 * It handles the multi-step UI Clerk sometimes presents
 * (email first, then password).
 */
async function signIn(page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });

  // Wait until either we're redirected or the form's email input appears
  try {
    await Promise.race([
      page.waitForURL(/create-profile|search/i, { timeout: 45_000 }),
      page
        .locator(
          "input#identifier-field, input[name='identifier'], input[placeholder*='email']"
        )
        .first()
        .waitFor({ state: "visible", timeout: 45_000 }),
    ]);
  } catch {
    // Ignore – we'll handle fallback logic below
  }

  // Two possibilities:
  // 1. The user is already authenticated -> Clerk immediately redirects to /create-profile or /search.
  // 2. We must interact with the Clerk form.

  const alreadySignedIn = await Promise.race([
    page
      .waitForURL(/create-profile|search/i, { timeout: 5_000 })
      .then(() => true)
      .catch(() => false),
    page
      .locator("input[type='email']")
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => false)
      .catch(() => false),
  ]);

  if (!alreadySignedIn) {
    // Helper to search across the main page and all iframes
    async function findInput(selector) {
      // Try repeatedly up to 60s, every 500ms
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        // Check main frame first
        const candidates = [page, ...page.frames()];
        for (const ctx of candidates) {
          const loc = ctx.locator(selector);
          try {
            await loc.waitFor({ state: "visible", timeout: 500 });
            return loc;
          } catch {
            // not found yet in this context
          }
        }
        await page.waitForTimeout(500);
      }
      return null;
    }

    // Email field
    const emailInputLoc = await findInput(
      "input#identifier-field, input[name='identifier'], input[type='email'], input.cl-formFieldInput__identifier, input[placeholder*='email']"
    );
    if (!emailInputLoc) {
      console.warn(
        "Email input not found after waiting. Will wait for redirect as if already signed in."
      );
    } else {
      await emailInputLoc.fill(EMAIL);

      // Submit email step immediately by pressing Enter (Clerk advances automatically).
      await emailInputLoc.press("Enter");

      // Password field
      const pwdLoc = await findInput(
        "input[type='password'], input#password-field"
      );
      if (pwdLoc) {
        await pwdLoc.fill(PASSWORD);
        // Immediately submit the form by pressing Enter – no button wait.
        await pwdLoc.press("Enter");
      }
    }

    // Wait for redirect after sign-in
    await page.waitForURL(/create-profile|search/i, { timeout: 90_000 });
  }
}

test.describe("Create profile wizard – comprehensive flow (live Convex)", () => {
  test("completes every step with full data entry and lands on /search", async ({
    page,
  }) => {
    // 2 min timeout – wizard involves many network calls + image upload
    test.setTimeout(120_000);

    await signIn(page);

    // If this account already HAS a profile, simply assert the redirect and exit.
    if (page.url().includes("/search")) {
      await expect(page).toHaveURL(/search/);
      return;
    }

    /*******************
     * STEP 0 – Basic Information
     *******************/
    // Full name
    await page.getByLabel(/full name/i).fill("E2E Comprehensive User");

    // Date of birth – 25yrs ago on Jan 1
    await page.getByRole("button", { name: /pick a date/i }).click();
    // Wait until the calendar dropdowns are rendered
    await page
      .locator(".rdp-caption select")
      .first()
      .waitFor({ state: "visible" });
    const yearSelect = page.locator('[aria-label^="Year"]');
    await yearSelect.waitFor({ state: "visible" });
    const targetYear = new Date().getFullYear() - 25;
    await yearSelect.selectOption(String(targetYear));
    // Month dropdown is the second <select> inside the same caption, if present
    const monthSelect = page.locator('[aria-label^="Month"]');
    if (await monthSelect.count()) {
      await monthSelect.selectOption("1"); // January
    }
    await page.locator(".rdp-day", { hasText: "1" }).first().click();

    // Gender
    await page.getByLabel("Gender").click();
    await page.getByRole("option", { name: /male/i }).click();

    // Height slider – move a bit right
    const slider = page.getByRole("slider");
    await slider.focus();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("ArrowRight");
    }

    // Phone number
    await page.getByLabel(/phone number/i).fill("+44 7123 456789");

    await page.getByRole("button", { name: /next/i }).click();

    /*******************
     * STEP 1 – Location & Lifestyle
     *******************/
    // UK City
    await page.getByLabel(/uk city/i).click();
    await page.getByRole("option", { name: /london/i }).click();

    // Postcode
    await page.getByLabel(/postcode/i).fill("SW1A 1AA");

    // Diet
    await page.getByLabel(/diet/i).click();
    await page.getByRole("option", { name: /vegetarian/i }).click();

    // Smoking
    await page.getByLabel(/smoking/i).click();
    await page.getByRole("option", { name: /^no$/i }).click();

    // Drinking
    await page.getByLabel(/drinking/i).click();
    await page.getByRole("option", { name: /^no$/i }).click();

    // Physical Status
    await page.getByLabel(/physical status/i).click();
    await page.getByRole("option", { name: /normal/i }).click();

    await page.getByRole("button", { name: /next/i }).click();

    /*******************
     * STEP 2 – Cultural Background
     *******************/
    await page.getByLabel(/marital status/i).click();
    await page.getByRole("option", { name: /single/i }).click();

    await page.getByRole("button", { name: /next/i }).click();

    /*******************
     * STEP 3 – Education & Career
     *******************/
    await page.getByLabel(/education/i).fill("BSc Computer Science");
    await page.getByLabel(/occupation/i).fill("QA Engineer");
    await page.getByLabel(/annual income/i).fill("55000");

    await page.getByRole("button", { name: /next/i }).click();

    /*******************
     * STEP 4 – About & Preferences
     *******************/
    await page
      .getByLabel(/about me/i)
      .fill("Passionate tester who loves automation and ensuring quality.");

    // Preferred Gender
    await page.getByLabel(/preferred gender/i).click();
    await page.getByRole("option", { name: /female/i }).click();

    await page.getByLabel(/min preferred partner age/i).fill("20");
    await page.getByLabel(/max preferred partner age/i).fill("35");

    await page.getByLabel(/preferred partner uk city/i).fill("London");

    await page.getByRole("button", { name: /next/i }).click();

    /*******************
     * STEP 5 – Profile Photos
     *******************/
    // Wait until the upload area is ready (wizard creates profile in background)
    await page.waitForSelector('input[type="file"]', { timeout: 30_000 });

    const fileInput = page.locator('input[type="file"]').first();
    // Absolute path to sample image in repo
    const imagePath = path.resolve(__dirname, "../public/afghan.jpg");
    await fileInput.setInputFiles(imagePath);

    // Wait for the uploaded image to appear in the DOM (thumbnail)
    await expect(page.locator('img[src*="/api"]')).toBeVisible({
      timeout: 30_000,
    });

    /*******************
     * FINISH – Submit wizard
     *******************/
    // The final button is labelled "Create Profile"
    await page.getByRole("button", { name: /create profile/i }).click();

    // Expect redirect to success splash page first
    await page.waitForURL(/create-profile\/success/, { timeout: 60_000 });
    await expect(page).toHaveURL(/create-profile\/success/);

    // Click "Start Searching" to land on /search
    await page.getByRole("button", { name: /start searching/i }).click();

    await page.waitForURL(/search/, { timeout: 15_000 });
    await expect(page).toHaveURL(/search/);
  });
});
