module.exports = {
  extends: ["next"],
  rules: {
    "react/no-unescaped-entities": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "react-hooks/exhaustive-deps": "off",
    "@next/next/no-img-element": "off",
    "@next/next/no-page-custom-font": "off",
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "out/",
    "build/",
    "src/__tests__/**/*",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
  ],
};
