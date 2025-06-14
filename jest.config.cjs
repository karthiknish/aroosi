/* eslint-disable */
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  coveragePathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  testPathIgnorePatterns: [
    "<rootDir>/e2e/",
    "<rootDir>/playwright-report/",
    "<rootDir>/__tests__/convex/",
    "<rootDir>/__tests__/pages/",
    "<rootDir>/__tests__/ui.formField.test.tsx",
    "<rootDir>/__tests__/convert.test.ts",
  ],
};

module.exports = createJestConfig(customJestConfig);
