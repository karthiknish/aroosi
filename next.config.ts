import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["quirky-akita-969.convex.cloud", "images.pexels.com"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
      "@convex": path.resolve(__dirname, "convex"),
    };

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
      "@convex": path.resolve(__dirname, "convex"),
    },
  },
};

export default nextConfig;
