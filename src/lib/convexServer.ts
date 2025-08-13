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
export async function buildForwardHeaders(): Promise<Record<string, string>> {
  const forward: Record<string, string> = {};

  // Safely load dynamic header and cookie stores (must be awaited in Next.js 15+)
  let h: Headers | null = null;
  try {
    // headers() can be a thenable in some runtimes
    const hr = await (headers() as unknown as Promise<Headers>);
    h = hr ?? null;
  } catch {
    h = null;
  }

  // Build Cookie header manually from cookie store
  try {
    const cStore = await (cookies() as unknown as Promise<any>);
    const all = typeof cStore?.getAll === "function" ? cStore.getAll() : [];
    const cookieHeader =
      Array.isArray(all) && all.length
        ? all.map((x: any) => `${x?.name}=${x?.value}`).join("; ")
        : "";
    if (cookieHeader) forward.cookie = cookieHeader;
  } catch {
    // ignore cookie extraction errors
  }

  // Note: earlier Next.js versions exposed a global cookie serializer; not used here

  try {
    const get = (name: string) => (h ? h.get(name) : null);
    const xff = get("x-forwarded-for");
    if (xff) forward["x-forwarded-for"] = xff;
    const xri = get("x-real-ip");
    if (xri) forward["x-real-ip"] = xri;
    const reqId = get("x-request-id");
    if (reqId) forward["x-request-id"] = reqId;
    const ua = get("user-agent");
    if (ua) forward["user-agent"] = ua;
    const accept = get("accept");
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
export async function convexQueryWithAuth(
  _request: Request,
  fn: any,
  args: any = {}
) {
  const forward = await buildForwardHeaders();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (serverConvex as any).query(fn, args, { headers: forward });
}

/**
 * Cookie-aware Convex mutation helper using generated api references.
 * Usage: await convexMutationWithAuth(request, api.users.createUserAndProfile, { ... })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function convexMutationWithAuth(
  _request: Request,
  fn: any,
  args: any = {}
) {
  const forward = await buildForwardHeaders();
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
