import { ConvexHttpClient } from "convex/browser";
import type { NextRequest } from "next/server";

/**
 * Helper to create a ConvexHttpClient that is authenticated with the
 * Bearer token forwarded from the incoming Next.js request.
 * The caller must include an `Authorization: Bearer <token>` header.
 */
export async function convexClientFromRequest(req: Request | NextRequest) {
  const tokenHeader = req.headers.get("Authorization");
  const token = tokenHeader?.startsWith("Bearer ")
    ? tokenHeader.split(" ")[1]
    : undefined;

  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  if (token) {
    client.setAuth(token);
  }
  return client;
}
