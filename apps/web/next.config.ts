import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type-checking external packages (tiptap) that have source TS issues
  typescript: {
    // Note: This is needed because @tiptap packages ship with TypeScript source
    // files that have compatibility issues with our TypeScript version.
    // The app code is still type-checked via `npm run type-check`
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "images.squarespace-cdn.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "aroosi-project.firebasestorage.app",
      },
      {
        protocol: "https",
        hostname: "www.aroosi.app",
      },
      {
        protocol: "https",
        hostname: "aroosi.app",
      },
      {
        protocol: "https",
        hostname: "i.pinimg.com",
      },
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
    // In a monorepo, Turbopack must be rooted at the workspace
    // so it can access the shared `node_modules` directory.
    root: path.resolve(__dirname, "../.."),
    resolveAlias: {
      "@": path.resolve(__dirname, "src"),
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
            // Allow microphone/camera on same-origin pages; keep geolocation disabled by default
            // Syntax: feature=(self) allows same-origin; () denies all
            value: "geolocation=(), microphone=(self), camera=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
