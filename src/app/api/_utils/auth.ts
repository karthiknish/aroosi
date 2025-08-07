/**
 * Cookie-only auth utilities for App Router API routes.
 * No Authorization header parsing; identity is derived from HttpOnly session cookies.
 */
import type { NextRequest } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function readCookie(req: NextRequest, name: string): string | null {
  try {
    const v = req.cookies.get(name)?.value;
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

/**
 * Resolve current user strictly via cookies-backed session on the server.
 * Returns { userId, user, profile } or an errorResponse.
 */
export async function requireSession(
  req: NextRequest
): Promise<
  | { userId: Id<"users">; user: any; profile: any | null }
  | { errorResponse: Response }
> {
  // Look for any of our accepted session cookies
  const sessionToken =
    readCookie(req, "__Secure-next-auth.session-token") ||
    readCookie(req, "next-auth.session-token") ||
    readCookie(req, "__Secure-session-token") ||
    readCookie(req, "session-token") ||
    readCookie(req, "auth-token") ||
    readCookie(req, "jwt");

  if (!sessionToken) {
    return {
      errorResponse: json(401, { success: false, error: "No auth session" }),
    };
  }

  // Use Convex server-side identity to fetch user
  const current = (await fetchQuery(
    api.users.getCurrentUserWithProfile,
    {}
  ).catch(() => null as any)) as any;

  const user = (current as any)?.user ?? current ?? null;
  if (!user) {
    return { errorResponse: json(404, { success: false, error: "User not found" }) };
  }
  if (user.banned) {
    return { errorResponse: json(403, { success: false, error: "Account is banned" }) };
  }

  // Optionally also load a public profile for convenience
  let profile: any | null = null;
  try {
    profile = await fetchQuery(api.users.getProfileByUserIdPublic, {
      userId: user._id as Id<"users">,
    });
  } catch {
    profile = null;
  }

  return { userId: user._id as Id<"users">, user, profile };
}

/**
 * For admin-only routes. Relies on server-verified role on user object.
 */
export async function requireAdminSession(
  req: NextRequest
): Promise<
  | { userId: Id<"users">; user: any; profile: any | null }
  | { errorResponse: Response }
> {
  const res = await requireSession(req);
  if ("errorResponse" in res) return res;
  const { userId, user, profile } = res;
  const role = (user.role as string) || "user";
  if (role !== "admin") {
    return { errorResponse: json(403, { success: false, error: "Admin privileges required" }) };
  }
  return { userId, user, profile };
}

// Legacy JWT helpers removed in cookie-only model
export function extractRoleFromToken(): undefined {
  return undefined;
}

export function extractUserIdFromToken(): null {
  return null;
}

export function isAdminToken(): boolean {
  return false;
}

export async function requireAdminToken(
  req: import("next/server").NextRequest
): Promise<{ userId?: string } | { errorResponse: Response }> {
  const res = await requireAdminSession(req as unknown as NextRequest);
  if ("errorResponse" in res) return res;
  return { userId: String(res.userId) };
}

export async function requireUserToken(
  req: import("next/server").NextRequest
): Promise<{ userId?: string } | { errorResponse: Response }> {
  const res = await requireSession(req as unknown as NextRequest);
  if ("errorResponse" in res) return res;
  return { userId: String(res.userId) };
}

/**
 * Debug logger for API routes. Emits structured logs only in development.
 */
export function devLog(
  level: "info" | "warn" | "error",
  scope: string,
  message: string,
  extra?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "production") return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(extra && Object.keys(extra).length > 0 ? { extra } : {}),
  };
  // eslint-disable-next-line no-console
  if (level === "error") {
    console.error(payload);
    return;
  }
  // eslint-disable-next-line no-console
  if (level === "warn") {
    console.warn(payload);
    return;
  }
  // eslint-disable-next-line no-console
  console.info(payload);
}
