import { config as loadEnv } from "dotenv";
loadEnv();
loadEnv({ path: ".env.local" });
console.log(
  "Native auth config loaded in Playwright:",
  process.env.JWT_ACCESS_SECRET
    ? "JWT secrets configured"
    : "JWT secrets missing"
);
import { devices } from "@playwright/test";

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: "./apps/web/e2e",
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? "github"
    : [["html", { outputFolder: "apps/web/playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: {
      mode: "on",
      sources: true,
      snapshots: true,
    },
    headless: true,
  },
  outputDir: "apps/web/test-results",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
};

export default config;
