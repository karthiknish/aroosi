import { test, expect } from "@playwright/test";

test.describe("Protected routes", () => {
  test("unauthenticated user is redirected to sign-in when accessing /search", async ({
    page,
  }) => {
    // Increase timeout for slower CI environments
    test.setTimeout(60000);

    // Go directly to the protected route
    await page.goto("/search");

    // Expect a redirect to the sign-in page including redirect_url param
    await expect(page).toHaveURL(/\/sign-in/i, { timeout: 15000 });

    // Check that the Sign In heading is visible to confirm page rendered
    await expect(
      page.getByRole("heading", { name: /sign in/i, level: 1 })
    ).toBeVisible();
  });
});
