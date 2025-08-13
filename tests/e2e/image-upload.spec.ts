import { test, expect } from '@playwright/test';

// Helper: generate a tiny red 2x2 JPEG in-memory and save to a temp file Playwright can upload
async function createTinyJpeg(page: any): Promise<string> {
  // Use the browser context to draw a tiny canvas and export as dataURL, then write to tmp via Node in the test process
  const dataUrl: string = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 2, 2);
    return canvas.toDataURL('image/jpeg', 0.5);
  });

  // Convert dataURL to Buffer in Node and write to a unique temp path
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');

  const dir = mkdtempSync(join(tmpdir(), 'aroosi-e2e-'));
  const filePath = join(dir, 'tiny.jpg');
  writeFileSync(filePath, buf);
  return filePath;
}

test.describe('Local image upload E2E', () => {
  test('walk wizard, upload local image, complete signup, and verify persistence', async ({ page, request, baseURL }) => {
    // Sanity check baseURL
    const origin = baseURL ?? "http://localhost:3000";

    // Navigate to the onboarding entry point. Adjust path if different (e.g., a CTA opens modal).
    await page.goto(origin + "/");

    // Open the profile creation modal if not automatically open.
    // Heuristic: look for the modal's title "Find Your Perfect Match"
    const modalTitle = page.getByRole("heading", {
      name: "Find Your Perfect Match",
    });
    // If modal isn't visible, try clicking a CTA that opens it. Adapt if your homepage opens it automatically.
    if (!(await modalTitle.isVisible().catch(() => false))) {
      // Attempt a generic CTA; adjust selector if you have a known trigger
      const cta = page
        .getByRole("button", { name: /Get Started|Create Profile|Join/i })
        .first();
      if (await cta.isVisible().catch(() => false)) {
        await cta.click();
      }
      await expect(modalTitle).toBeVisible({ timeout: 10000 });
    }

    // Step 1 (Basic Information) only shows if basic data not provided earlier.
    // Fill minimal required fields and proceed.
    // profileFor
    if (
      await page
        .getByLabel(/This profile is for/i)
        .isVisible()
        .catch(() => false)
    ) {
      await page.getByLabel(/This profile is for/i).click();
      await page.getByRole("option", { name: /Myself/i }).click();
      // Gender buttons
      const maleBtn = page.getByRole("button", { name: /^Male$/ });
      const femaleBtn = page.getByRole("button", { name: /^Female$/ });
      if (await maleBtn.isVisible().catch(() => false)) {
        await maleBtn.click();
      } else if (await femaleBtn.isVisible().catch(() => false)) {
        await femaleBtn.click();
      }
      // Next
      const nextBtn = page.getByRole("button", { name: /^Next$/ });
      await nextBtn.click();
    }

    // Step 2: Location & Physical (required fields: city, height, maritalStatus; country required via label)
    // Country
    const countryLabel = page.getByLabel(/Country/i);
    await countryLabel.click();
    // Select first option "Afghanistan" or any option available
    const countryOption = page.getByRole("option").first();
    await countryOption.click();

    // City
    const cityInput = page.getByLabel(/^City$/);
    await cityInput.fill("Kabul");

    // Height: select an option with pattern "(cm)"
    const heightLabel = page.getByLabel(/^Height$/);
    await heightLabel.click();
    // Choose a mid value like "5'8" (173 cm)" by selecting first available option
    await page.getByRole("option").first().click();

    // Marital Status
    const maritalLabel = page.getByLabel(/^Marital Status$/);
    await maritalLabel.click();
    await page.getByRole("option", { name: /Single/ }).click();

    // Next
    await page.getByRole("button", { name: /^Next$/ }).click();

    // Step 3: Cultural & Lifestyle (optional, proceed)
    await page.getByRole("button", { name: /^Next$/ }).click();

    // Step 4: Education & Career (required: education, occupation, aboutMe)
    await page.getByLabel(/^Education$/).fill("Bachelor's");
    await page.getByLabel(/^Occupation$/).fill("Engineer");
    await page
      .getByLabel(/^About Me$/)
      .fill("E2E test user — verifying local image upload.");
    await page.getByRole("button", { name: /^Next$/ }).click();

    // Step 5: Partner Preferences (required: preferredGender; optional others)
    const genderPrefLabel = page.getByLabel(/^Preferred Gender$/);
    await genderPrefLabel.click();
    await page
      .getByRole("option", { name: /Any|Male|Female/ })
      .first()
      .click();
    // Optional preferred cities
    const prefCityInput = page.getByLabel(/^Preferred Cities$/);
    if (await prefCityInput.isVisible().catch(() => false)) {
      await prefCityInput.fill("Kabul, London");
    }
    await page.getByRole("button", { name: /^Next$/ }).click();

    // Step 6: Photos (optional)
    // Generate tiny JPEG and attach to dropzone file input in unified ImageUploader (hidden input)
    // We search by input[type=file] present inside the upload container
    const fileInput = page.locator('input[type="file"][multiple]');
    const tinyPath = await createTinyJpeg(page);
    await fileInput.setInputFiles(tinyPath);

    // Expect one preview tile to render (grid of 3 cols). Use role img or next/image wrapper selector.
    // Next.js <Image> renders as img inside a wrapper. Check for an img with alt "Selected 1".
    await expect(page.locator('img[alt="Selected 1"]')).toBeVisible({
      timeout: 10000,
    });

    // Next to Step 7
    await page.getByRole("button", { name: /^Next$/ }).click();

    // Step 7: Account Creation
    // The CustomSignupForm is used and auto submission happens when authenticated.
    // Fill signup fields. We will generate a unique email for the test run.
    const unique = Date.now();
    const email = `e2e.user.${unique}@example.com`;
    const password = "E2eTest!12345";
    // Fill standard fields the CustomSignupForm expects. We try generic selectors by placeholders/labels.
    // Adjust the selectors to your actual fields if needed.
    const emailInput = page
      .getByRole("textbox", { name: /email/i })
      .first()
      .or(page.getByPlaceholder("Email").first());
    const pwdInput = page
      .getByLabel(/password/i)
      .first()
      .or(page.getByPlaceholder(/password/i).first());

    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(email);
    }
    if (await pwdInput.isVisible().catch(() => false)) {
      await pwdInput.fill(password);
    }

    // Submit the signup form
    const submitBtn = page
      .getByRole("button", { name: /Sign Up|Create Account|Continue/i })
      .first();
    await submitBtn.click();

    // Wait for success redirect or success toast and subsequent redirect to /success
    await page.waitForURL("**/success", { timeout: 60_000 });

    // After success, we are authenticated; call the API to fetch profile images and assert at least 1 exists
    const imagesResp = await request.get(origin + "/api/profile-images");
    expect(imagesResp.ok()).toBeTruthy();

    const imagesJson = await imagesResp.json();
    // API routes wrap response in success envelopes in this codebase; support both array and envelope
    // Expected envelope shape: { success: true, data: [...] }
    let data: unknown = imagesJson as unknown;
    if (
      imagesJson &&
      typeof imagesJson === "object" &&
      Object.prototype.hasOwnProperty.call(
        imagesJson as Record<string, unknown>,
        "data"
      )
    ) {
      const maybe = (imagesJson as Record<string, unknown>)["data"];
      data = maybe;
    }
    expect(Array.isArray(data)).toBeTruthy();
    const arr = Array.isArray(data) ? (data as unknown[]) : [];
    expect(arr.length).toBeGreaterThan(0);

    // Additionally assert first image has required fields
    const first = (arr[0] ?? {}) as Record<string, unknown>;
    expect(typeof first).toBe("object");
    // Common fields in ImageType: id/_id/url/fileName/size/etc. We assert a subset.
    const idOrUnderscoreId = first["id"] ?? first["_id"];
    expect(typeof idOrUnderscoreId).toBe("string");
  });
});