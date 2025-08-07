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
  // 1) Try Convex cookie-backed identity first
  try {
    const current = (await fetchQuery(api.users.getCurrentUserWithProfile, {})) as any;
    const user = current?.user ?? current ?? null;
    if (user) {
      if (user.banned) {
        return { errorResponse: json(403, { success: false, error: "Account is banned" }) };
      }
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
  } catch {
    // fall through to JWT cookie parsing
  }

  // 2) Fallback: try our JWT auth cookie (set by sign-in/google routes)
  const rawAuthCookie =
    readCookie(req, "__Secure-auth-token") || readCookie(req, "auth-token");

  if (!rawAuthCookie) {
    return {
      errorResponse: json(401, { success: false, error: "No auth session" }),
    };
  }

  const claims = await parseAndVerifyJwt(rawAuthCookie).catch(() => null as any);
  if (!claims || typeof claims !== "object") {
    return {
      errorResponse: json(401, { success: false, error: "Invalid session" }),
    };
  }

  const email = typeof (claims as any).email === "string" ? (claims as any).email : undefined;
  if (!email) {
    return {
      errorResponse: json(401, { success: false, error: "Invalid session payload" }),
    };
  }

  // Fetch user by email
  const user = (await fetchQuery(api.users.getUserByEmail, { email }).catch(() => null as any)) as any;
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

// ------------------------------------------------------------
// Minimal JWT HS256 verification for our cookie-based auth
// ------------------------------------------------------------

async function parseAndVerifyJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const encoder = new TextEncoder();
    const data = `${headerB64}.${payloadB64}`;

    const secret = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change";
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    const signature = bufferToBase64Url(new Uint8Array(sig));
    if (timingSafeEqual(signature, sigB64) === false) {
      return null;
    }

    const payloadJson = JSON.parse(base64UrlDecode(payloadB64) || "null");
    if (!payloadJson || typeof payloadJson !== "object") return null;
    // exp check (seconds)
    const now = Math.floor(Date.now() / 1000);
    const exp = (payloadJson as any).exp as number | undefined;
    if (typeof exp === "number" && exp < now) return null;
    return payloadJson as Record<string, unknown>;
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 2 ? "==" : input.length % 4 === 3 ? "=" : "";
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function bufferToBase64Url(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}
