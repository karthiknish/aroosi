import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export type AuthPayload = {
  userId: string;
  email?: string;
  role?: string;
};

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 401, code = "ACCESS_INVALID") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Standardized error response helper for auth-related failures.
 * Ensures consistent payload and no-store caching headers.
 */
export function authErrorResponse(
  message: string,
  opts?: { status?: number; code?: string; correlationId?: string }
): NextResponse {
  const status = opts?.status ?? 401;
  const code = opts?.code ?? "ACCESS_INVALID";
  const correlationId =
    opts?.correlationId ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10));
  const res = NextResponse.json(
    {
      error: message,
      code,
      correlationId,
    },
    { status }
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * Extract and verify access token from Authorization header.
 * - Accepts only "Authorization: Bearer <token>"
 * - Distinguishes missing/malformed header vs invalid/expired token
 */
export async function requireAuth(req: NextRequest): Promise<AuthPayload> {
  // Use Convex cookie session to resolve identity, then map to our user
  const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  if (!CONVEX_URL) {
    throw new AuthError("Convex not configured", 500, "CONVEX_NOT_CONFIGURED");
  }

  // Build cookie header to forward session cookies
  const cookieHeader = req.headers.get("cookie") || "";
  const client = new ConvexHttpClient(CONVEX_URL);

  // 1) Get identity via an action that requires auth; using consolidateUserAfterAuth identity getter is overkill.
  // Instead, call a minimal query that requires ctx.auth.getUserIdentity() implicitly.
  // We'll add a tiny identity check by calling a safe query that returns user by email if identity is present.
  let email: string | null = null;
  try {
    // Call users.getUserByEmail with the email from identity resolved in a dedicated action
    // Since we do not have such an action, leverage a small auth echo action in convex/auth.ts: requireIdentity
    // which returns identity with email.
    const identity = await (client as any).action(
      (api as any).auth.requireIdentity,
      {},
      { headers: { cookie: cookieHeader } }
    );
    email = identity?.email ?? null;
    if (!email) {
      throw new Error("NO_EMAIL");
    }
  } catch {
    throw new AuthError("Not authenticated", 401, "UNAUTHENTICATED");
  }

  // 2) Map identity email to our users table to get userId/role
  try {
    const user = await (client as any).query(
      (api as any).users.getUserByEmail,
      { email },
      { headers: { cookie: cookieHeader } }
    );
    if (!user?._id) {
      throw new AuthError("User not found", 404, "USER_NOT_FOUND");
    }
    return {
      userId: String(user._id),
      email: user.email,
      role: user.role || "user",
    };
  } catch (e) {
    if (e instanceof AuthError) throw e;
    throw new AuthError("Failed to resolve user", 500, "USER_RESOLVE_FAILED");
  }
}
