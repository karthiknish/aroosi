import { NextRequest, NextResponse } from "next/server";
import { verifyAccessJWT } from "@/lib/auth/jwt";

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
 */
export async function requireAuth(req: NextRequest): Promise<AuthPayload> {
  const header =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new AuthError("Missing Authorization header", 401, "ACCESS_INVALID");
  }
  const token = header.slice(7).trim();
  if (!token) throw new AuthError("Missing token", 401, "ACCESS_INVALID");
  try {
    const payload = await verifyAccessJWT(token);
    if (!payload?.userId) throw new Error("Invalid token payload");
    return payload as AuthPayload;
  } catch (e) {
    throw new AuthError(
      "Invalid or expired access token",
      401,
      "ACCESS_INVALID"
    );
  }
}
