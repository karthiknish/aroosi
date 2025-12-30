/**
 * Firebase cookie-based auth utilities for App Router API routes.
 * Replaces legacy Convex identity. Identity is derived from the Firebase ID token stored in HttpOnly cookie (firebaseAuthToken).
 * Provides backward compatible helpers: requireSession / requireAdminSession returning { userId, user, profile } or { errorResponse }.
 */
import type { NextRequest } from "next/server";
import {
  verifyFirebaseIdToken,
  getFirebaseUser,
  db,
  adminAuth,
  COLLECTIONS,
} from "@/lib/firebaseAdmin";

// Backward compatibility: some call sites imported Id<"users"> types from Convex.
// We alias to string so existing type annotations (if any) tolerate transition.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Id<T extends string> = string & { __brand?: T };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

import { errorResponse } from "@/lib/api/handler";

// ... (existing code)

function readCookie(req: NextRequest, name: string): string | null {
  try {
    const v = req.cookies.get(name)?.value;
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

function asNextRequest(req: NextRequest | Request): NextRequest {
  // In Next.js App Router route handlers, the runtime request is a NextRequest.
  // Some call sites type it as Request, so we normalize here.
  return req as NextRequest;
}

/**
 * Resolve current user strictly via cookies-backed session on the server.
 * Returns { userId, user, profile } or an errorResponse.
 */
export async function requireSession(
  req: NextRequest | Request
): Promise<
  | { userId: Id<"users">; user: any; profile: any | null }
  | { errorResponse: Response }
> {
  const nextReq = asNextRequest(req);
  // Prefer Firebase ID token cookie
  let firebaseToken = readCookie(nextReq, "firebaseAuthToken");
  // Fallback: Authorization: Bearer <token>
  if (!firebaseToken) {
    const authz =
      nextReq.headers.get("authorization") || nextReq.headers.get("Authorization");
    if (authz && authz.toLowerCase().startsWith("bearer ")) {
      firebaseToken = authz.slice(7).trim() || null;
    }
  }
  if (!firebaseToken) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[requireSession] Missing auth (no cookie, no bearer)");
    }
    return {
      errorResponse: errorResponse("No auth session", 401, { code: "UNAUTHORIZED" }),
    };
  }
  let decoded: any;
  try {
    decoded = await verifyFirebaseIdToken(firebaseToken);
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[requireSession] Token verification failed");
    }
    return {
      errorResponse: errorResponse("Invalid session", 401, { code: "TOKEN_INVALID" }),
    };
  }
  const uid: string | undefined = decoded?.uid;
  if (!uid) {
    return {
      errorResponse: errorResponse("Invalid token payload", 401, { code: "TOKEN_INVALID" }),
    };
  }
  let userDoc = await getFirebaseUser(uid);
  if (!userDoc) {
    // Auto-bootstrap a minimal Firestore user document if Firebase Auth user exists but profile doc missing
    try {
      const authUser = await adminAuth.getUser(uid);
      if (authUser) {
        const now = Date.now();
        const email = authUser.email ? authUser.email.toLowerCase() : "";
        await db.collection(COLLECTIONS.USERS).doc(uid).set(
          {
            email,
            createdAt: now,
            updatedAt: now,
            role: "user",
            subscriptionPlan: "free",
          },
          { merge: true }
        );
        userDoc = await getFirebaseUser(uid);
      }
    } catch {
      // ignore
    }
    if (!userDoc) {
      return {
        errorResponse: errorResponse("User not found", 404, { code: "NOT_FOUND" }),
      };
    }
  }
  if (userDoc.banned) {
    return {
      errorResponse: errorResponse("Account is banned", 403, { code: "FORBIDDEN" }),
    };
  }
  // Basic public profile (could be expanded if separate collection later)
  const profile = userDoc; // unify for now
  return { userId: uid as Id<"users">, user: userDoc, profile };
}

/**
 * Same as requireSession but DOES NOT block banned users. Use for endpoints that must allow
 * banned users, such as submitting an appeal.
 */
export async function requireSessionAllowBanned(
  req: NextRequest | Request
): Promise<
  | { userId: Id<"users">; user: any; profile: any | null }
  | { errorResponse: Response }
> {
  const res = await requireSessionCore(asNextRequest(req), { allowBanned: true });
  if ("errorResponse" in res) return res;
  return res;
}

// Internal core to avoid duplication; not exported
async function requireSessionCore(
  req: NextRequest,
  options?: { allowBanned?: boolean }
): Promise<
  | { userId: Id<"users">; user: any; profile: any | null }
  | { errorResponse: Response }
> {
  // Prefer Firebase ID token cookie
  let firebaseToken = readCookie(req, "firebaseAuthToken");
  if (!firebaseToken) {
    const authz =
      req.headers.get("authorization") || req.headers.get("Authorization");
    if (authz && authz.toLowerCase().startsWith("bearer ")) {
      firebaseToken = authz.slice(7).trim() || null;
    }
  }
  if (!firebaseToken) {
    return {
      errorResponse: errorResponse("No auth session", 401, { code: "UNAUTHORIZED" }),
    };
  }
  let decoded: any;
  try {
    decoded = await verifyFirebaseIdToken(firebaseToken);
  } catch {
    return {
      errorResponse: errorResponse("Invalid session", 401, { code: "TOKEN_INVALID" }),
    };
  }
  const uid: string | undefined = decoded?.uid;
  if (!uid) {
    return {
      errorResponse: errorResponse("Invalid token payload", 401, { code: "TOKEN_INVALID" }),
    };
  }
  let userDoc = await getFirebaseUser(uid);
  if (!userDoc) {
    try {
      const authUser = await adminAuth.getUser(uid);
      if (authUser) {
        const now = Date.now();
        const email = authUser.email ? authUser.email.toLowerCase() : "";
        await db.collection(COLLECTIONS.USERS).doc(uid).set(
          {
            email,
            createdAt: now,
            updatedAt: now,
            role: "user",
            subscriptionPlan: "free",
          },
          { merge: true }
        );
        userDoc = await getFirebaseUser(uid);
      }
    } catch (e) {
      // ignore
    }
    if (!userDoc) {
      return {
        errorResponse: errorResponse("User not found", 404, { code: "NOT_FOUND" }),
      };
    }
  }
  if (userDoc.banned && !options?.allowBanned) {
    return {
      errorResponse: errorResponse("Account is banned", 403, { code: "FORBIDDEN" }),
    };
  }
  const profile = userDoc;
  return { userId: uid as Id<"users">, user: userDoc, profile };
}

/**
 * For admin-only routes. Relies on server-verified role on user object.
 */
export async function requireAdminSession(
  req: NextRequest | Request
): Promise<
  | { userId: Id<"users">; user: any; profile: any | null }
  | { errorResponse: Response }
> {
  const res = await requireSession(req);
  if ("errorResponse" in res) return res;
  const { userId, user, profile } = res;
  const role = (user.role as string) || "user";
  if (role !== "admin") {
    return { errorResponse: errorResponse("Admin privileges required", 403, { code: "FORBIDDEN" }) };
  }
  return { userId, user, profile };
}

export async function requireAdminToken(
  req: import("next/server").NextRequest | Request
): Promise<{ userId?: string } | { errorResponse: Response }> {
  const res = await requireAdminSession(req);
  if ("errorResponse" in res) return res;
  return { userId: String(res.userId) };
}

export async function requireUserToken(
  req: import("next/server").NextRequest | Request
): Promise<{ userId?: string } | { errorResponse: Response }> {
  const res = await requireSession(req);
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

// Legacy JWT helpers removed; Firebase handles token verification.
// (Intentionally left blank for backward compatibility expectations.)
