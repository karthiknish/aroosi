import { test, expect } from "@playwright/test";

const PROFILE_FIXTURE_URL =
  "/e2e/profile?me=user1&other=user2&token=test-token";

test.describe("Interest sending/withdrawing", () => {
  test("user can send and withdraw interest", async ({ page }) => {
    test.setTimeout(60000);

    // Intercept POST & DELETE to /api/interests
    let lastMethod = "";
    await page.route("**/api/interests", (route, request) => {
      lastMethod = request.method();
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(PROFILE_FIXTURE_URL);

    const btn = page.locator("button");
    const status = page.locator("[data-testid=status]");

    // Initial status idle
    await expect(status).toHaveText("idle");

    // Click to send interest
    await btn.click();
    await expect(status).toHaveText("success");
    expect(lastMethod).toBe("POST");

    // Click again to withdraw interest
    await btn.click();
    await expect(status).toHaveText("success");
    expect(lastMethod).toBe("DELETE");
  });
});
