import { ConvexReactClient } from "convex/react";

if (!process.env.NEXT_PUBLIC_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL.length === 0) {
  // Intentionally avoid throwing to keep build working; log a clear message instead.
  // Consumers will fail at runtime if they attempt to use the client without URL configured.
  // eslint-disable-next-line no-console
  console.warn(
    "[convexClient] NEXT_PUBLIC_CONVEX_URL is not set. ConvexReactClient will not be able to connect."
  );
}

/**
 * Singleton Convex React client for the browser.
 * - Uses cookie-based auth; no Authorization headers required on the client.
 * - URL must be provided via NEXT_PUBLIC_CONVEX_URL.
 */
export const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");
