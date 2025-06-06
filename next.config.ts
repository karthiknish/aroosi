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
