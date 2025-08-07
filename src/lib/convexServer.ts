/**
 * Convex server utilities (cookie-aware) for Next.js App Router.
 * - Cookie-only forwarding (no Authorization header).
 * - Works inside app/api/.../route.ts handlers.
 * Docs: https://labs.convex.dev/auth/setup
 */

import { cookies, headers } from "next/headers";
// Prefer node client on the server if your route runtime supports Node APIs:
// import { ConvexHttpClient } from "convex/node";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const serverConvex = new ConvexHttpClient(CONVEX_URL);

/**
 * Forward cookie-based session and selected proxy headers to Convex.
 * Keep types relaxed to avoid coupling to framework internals.
 */
export function buildForwardHeaders(): Record<string, string> {
  // In some Next.js environments, headers() can be a thenable. Normalize to a Headers-like API.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = headers() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h: any = typeof raw?.get === "function" ? raw : (raw?.headers ?? {});
  const c = cookies();
  const forward: Record<string, string> = {};

  try {
    // Next cookies() supports toString serialization of all cookies
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookieHeader = (c as any)?.toString ? (c as any).toString() : "";
    if (cookieHeader) forward.cookie = cookieHeader;
  } catch {
    // ignore cookie extraction errors
  }

  try {
    const xff = h?.get?.("x-forwarded-for");
    if (xff) forward["x-forwarded-for"] = xff;
    const xri = h?.get?.("x-real-ip");
    if (xri) forward["x-real-ip"] = xri;
    const reqId = h?.get?.("x-request-id");
    if (reqId) forward["x-request-id"] = reqId;
    const ua = h?.get?.("user-agent");
    if (ua) forward["user-agent"] = ua;
    const accept = h?.get?.("accept");
    if (accept) forward.accept = accept;
  } catch {
    // ignore header extraction errors
  }

  return forward;
}

/**
 * Cookie-aware Convex query helper using generated api references.
 * Usage: await convexQueryWithAuth(request, api.users.getProfileByUserIdPublic, { userId })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function convexQueryWithAuth(_request: Request, fn: any, args: any = {}) {
  const forward = buildForwardHeaders();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (serverConvex as any).query(fn, args, { headers: forward });
}

/**
 * Cookie-aware Convex mutation helper using generated api references.
 * Usage: await convexMutationWithAuth(request, api.users.createUserAndProfile, { ... })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function convexMutationWithAuth(_request: Request, fn: any, args: any = {}) {
  const forward = buildForwardHeaders();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (serverConvex as any).mutation(fn, args, { headers: forward });
}

/**
 * Convenience helpers namespace.
 */
export const convexUsers = {
  getProfileByUserIdPublic: (request: Request, userId: string) =>
    convexQueryWithAuth(request, api.users.getProfileByUserIdPublic, { userId }),
};
