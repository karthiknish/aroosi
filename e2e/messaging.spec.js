import { test, expect } from "@playwright/test";

const CHAT_URL =
  "/e2e/chat?id=test-convo&me=user1&other=user2&token=test-token";

test.describe("ModernChat messaging", () => {
  test("user can send a message and it appears in the chat", async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Intercept initial GET for messages and respond with empty list
    await page.route("**/api/match-messages?*", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      } else if (route.request().method() === "POST") {
        // Echo back sent text for POST requests
        const reqJson = route.request().postDataJSON();
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              _id: "msg-1",
              conversationId: reqJson.conversationId,
              fromUserId: reqJson.fromUserId,
              toUserId: reqJson.toUserId,
              text: reqJson.text,
              createdAt: Date.now(),
            },
          }),
        });
      }
    });

    // Ignore EventSource requests
    await page.route("**/api/conversations/**", (route) => route.abort());

    // Visit the chat fixture page
    await page.goto(CHAT_URL);

    // Wait for input to be visible
    const input = page.getByPlaceholder("Type your message…");
    await expect(input).toBeVisible();

    // Type and send message
    const messageText = "Hello Playwright!";
    await input.fill(messageText);
    await page.getByRole("button", { name: /send/i }).click();

    // Expect message bubble to appear with the text
    await expect(page.locator("text='Hello Playwright!'")).toBeVisible();
  });
});
