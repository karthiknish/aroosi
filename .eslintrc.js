/**
 * ESLint config tuned for Vercel builds with Next.js 15 + TypeScript.
 * - Uses Next core-web-vitals rules
 * - Ensures TS parsing and React hooks/a11y plugins are available
 * - Ignores build artifacts and generated folders
 * - Sets proper parserOptions matching tsconfig paths
 */
module.exports = {
  root: true,
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks', 'jsx-a11y'],
  parserOptions: {
    project: undefined, // Avoid requiring a TS project file during Vercel build
    tsconfigRootDir: __dirname,
    ecmaVersion: 2023,
    sourceType: 'module',
  },
  env: {
    browser: true,
    node: true,
    es2023: true,
  },
  settings: {
    next: {
      rootDir: ['.'],
    },
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'build/',
    'coverage/',
    'playwright-report/',
    'convex/_generated/**',
  ],
  rules: {
    // Keep builds green while we migrate: prefer warnings for stylistic rules
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'jsx-a11y/no-autofocus': 'off',

    // Next.js 15 rules: keep defaults, but ensure no absolute-path image domains rule blocks builds
    '@next/next/no-img-element': 'warn',

    // General JS/TS
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
