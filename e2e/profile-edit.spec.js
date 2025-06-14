import { test, expect } from "@playwright/test";

const EDIT_FIXTURE_URL = "/e2e/edit?token=test-token";

test.describe("Profile edit", () => {
  test("user can update full name via API", async ({ page }) => {
    test.setTimeout(60000);

    // Intercept PUT to /api/profile
    let receivedBody;
    await page.route("**/api/profile", (route, request) => {
      if (request.method() === "PUT") {
        receivedBody = JSON.parse(request.postData() || "{}");
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { profile: { fullName: receivedBody.fullName } },
          }),
        });
      } else {
        route.abort();
      }
    });

    await page.goto(EDIT_FIXTURE_URL);

    const input = page.getByPlaceholder("Full name");
    const status = page.getByTestId("status");

    const newName = "Playwright Tester";
    await input.fill(newName);
    await page.getByRole("button", { name: /save/i }).click();

    await expect(status).toHaveText("success");

    // Validate request body captured
    expect(receivedBody.fullName).toBe(newName);
  });
});
