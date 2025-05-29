module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/.out/",
    "/convex/_generated/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@convex/(.*)$": "<rootDir>/convex/$1",
  },
};
