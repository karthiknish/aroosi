import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    domains: [
      // Legacy Convex domains left for historical images; can prune once confirmed unused
      "quirky-akita-969.convex.cloud",
      "proper-gull-501.convex.cloud",
      "images.pexels.com",
      "images.squarespace-cdn.com",
      "img.clerk.com",
      "images.clerk.dev",
      // Firebase Storage signed URLs and direct media endpoints
      "firebasestorage.googleapis.com",
      "storage.googleapis.com",
      // Custom bucket domain variant (if using CNAME / alternate)
      "aroosi-project.firebasestorage.app",
      // Added for Afghan Community Values homepage image
      "i.pinimg.com",
    ],
  },
  // Ensure proper transpilation for Safari compatibility
  transpilePackages: [],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
      // Removed legacy "@convex" alias
    };

    // Add fallback for monorepo dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };

    // Ensure dependencies from root node_modules are found
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      path.resolve(__dirname, "../../node_modules"),
      "node_modules",
    ];

    // Prevent Next dev watcher from rebuilding when Playwright writes traces/reports
    const currentWatchOpts = config.watchOptions || {};
    const ignoredExisting = currentWatchOpts.ignored || [];
    const extraIgnores = ["**/test-results/**", "**/playwright-report/**"];
    const combinedIgnores = Array.from(
      new Set(
        [
          ...(Array.isArray(ignoredExisting)
            ? ignoredExisting
            : ignoredExisting
              ? [ignoredExisting]
              : []),
          ...extraIgnores,
        ].filter((s) => typeof s === "string" && s.trim().length > 0)
      )
    );

    // Assign a fresh object to avoid mutating read-only config
    config.watchOptions = {
      ...currentWatchOpts,
      ignored: combinedIgnores,
    };

    return config;
  },
  turbopack: {
    resolveAlias: {
      "@": path.resolve(__dirname, "src"),
      // Removed legacy "@convex" alias
    },
  },
  // Add headers for better Safari compatibility
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Add feature policy headers for better cross-browser support
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
