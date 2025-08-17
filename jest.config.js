const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/e2e/", "<rootDir>/tests/e2e/"],
  // Reduce memory usage in CI/local by limiting workers
  maxWorkers: "50%",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)