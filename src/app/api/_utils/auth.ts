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
  // Prefer Firebase ID token cookie
  let firebaseToken = readCookie(req, "firebaseAuthToken");
  // Fallback: Authorization: Bearer <token>
  if (!firebaseToken) {
    const authz =
      req.headers.get("authorization") || req.headers.get("Authorization");
    if (authz && authz.toLowerCase().startsWith("bearer ")) {
      firebaseToken = authz.slice(7).trim() || null;
      // dev log omitted to satisfy linter
    }
  }
  if (!firebaseToken) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[requireSession] Missing auth (no cookie, no bearer)");
    }
    return {
      errorResponse: json(401, { success: false, error: "No auth session" }),
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
      errorResponse: json(401, { success: false, error: "Invalid session" }),
    };
  }
  const uid: string | undefined = decoded?.uid;
  if (!uid) {
    return {
      errorResponse: json(401, {
        success: false,
        error: "Invalid token payload",
      }),
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
        // dev log omitted to satisfy linter
      }
    } catch {
      // dev log omitted to satisfy linter
    }
    if (!userDoc) {
      return {
        errorResponse: json(404, { success: false, error: "User not found" }),
      };
    }
  }
  if (userDoc.banned) {
    return {
      errorResponse: json(403, { success: false, error: "Account is banned" }),
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
  req: NextRequest
): Promise<
  | { userId: Id<"users">; user: any; profile: any | null }
  | { errorResponse: Response }
> {
  const res = await requireSessionCore(req, { allowBanned: true });
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
    // dev log omitted to satisfy linter
    return {
      errorResponse: json(401, { success: false, error: "No auth session" }),
    };
  }
  let decoded: any;
  try {
    decoded = await verifyFirebaseIdToken(firebaseToken);
  } catch {
    // dev log omitted to satisfy linter
    return {
      errorResponse: json(401, { success: false, error: "Invalid session" }),
    };
  }
  const uid: string | undefined = decoded?.uid;
  if (!uid) {
    return {
      errorResponse: json(401, {
        success: false,
        error: "Invalid token payload",
      }),
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
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.info("[requireSession] Bootstrapped missing user profile", {
            uid,
            email,
          });
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[requireSession] Failed to bootstrap missing user doc", {
          uid,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    if (!userDoc) {
      return {
        errorResponse: json(404, { success: false, error: "User not found" }),
      };
    }
  }
  if (userDoc.banned && !options?.allowBanned) {
    return {
      errorResponse: json(403, { success: false, error: "Account is banned" }),
    };
  }
  const profile = userDoc;
  return { userId: uid as Id<"users">, user: userDoc, profile };
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

// Legacy JWT helpers removed; Firebase handles token verification.
// (Intentionally left blank for backward compatibility expectations.)
