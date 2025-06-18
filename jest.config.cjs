/* eslint-disable */
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./apps/web" });

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/apps/web/src/$1",
  },
  coveragePathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/apps/web/playwright-report/",
    "<rootDir>/apps/web/test-results/",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/apps/web/e2e/",
    "<rootDir>/apps/web/playwright-report/",
    "<rootDir>/__tests__/convex/",
    "<rootDir>/__tests__/pages/",
    "<rootDir>/__tests__/ui.formField.test.tsx",
    "<rootDir>/__tests__/convert.test.ts",
  ],
};

module.exports = createJestConfig(customJestConfig);
