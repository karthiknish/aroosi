import { ConvexHttpClient } from "convex/browser";
import type { NextRequest } from "next/server";

/**
 * Safely create a ConvexHttpClient.
 * – In development: throws if `NEXT_PUBLIC_CONVEX_URL` is missing so the developer notices immediately.
 * – In build/production with the route not actually invoked: returns `null` so bundling can still succeed.
 */
export function getConvexClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!url) {
    if (process.env.NODE_ENV === "development") {
      throw new Error("Environment variable NEXT_PUBLIC_CONVEX_URL is not set.");
    }
    // In production build we may not need Convex if the route isn't used.
    return null;
  }

  return new ConvexHttpClient(url);
}

/**
 * Helper to create a Convex client authenticated with the incoming request's
 * Bearer token. Returns `null` if Convex URL is not configured.
 */
export async function convexClientFromRequest(
  req: Request | NextRequest
): Promise<ConvexHttpClient | null> {
  const client = getConvexClient();
  if (!client) return null;

  const tokenHeader = req.headers.get("Authorization");
  const token = tokenHeader?.startsWith("Bearer ")
    ? tokenHeader.split(" ")[1]
    : undefined;

  if (token) {
    client.setAuth(token);
  }

  return client;
}
