import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdminInit";
import { DocumentSnapshot } from "firebase-admin/firestore";

export type AuthPayload = {
  userId: string;
  email?: string;
  role?: string;
  banned?: boolean;
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
 * Unified authentication verification for both Web and Mobile platforms.
 * Handles:
 * 1. Authorization: Bearer <token> (Preferred for Mobile and standard API calls)
 * 2. firebaseAuthToken cookie (Standard for Web requests)
 * 
 * Performance: Re-uses decoded tokens when possible and handles Firestore lookups efficiently.
 */
export async function requireAuth(req: NextRequest): Promise<AuthPayload & { isProfileComplete?: boolean }> {
  let idToken: string | undefined;

  // 1. Check Authorization Header (Highest priority)
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    idToken = authHeader.slice(7).trim();
  }

  // 2. Check Request Cookies
  if (!idToken) {
    idToken = req.cookies.get("firebaseAuthToken")?.value;
  }

  // 3. Fallback to global cookies (for server components or nested calls)
  if (!idToken) {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      idToken = cookieStore.get("firebaseAuthToken")?.value;
    } catch {
      // Ignore errors if called in a context where cookies() isn't available
    }
  }

  if (!idToken) {
    throw new AuthError("Missing authentication token", 401, "UNAUTHENTICATED");
  }

  // Verify Firebase ID Token
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (e: any) {
    const code = e?.code === "auth/id-token-expired" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
    throw new AuthError("Invalid authentication token", 401, code);
  }

  const uid = decoded.uid;
  if (!uid) throw new AuthError("Invalid token payload", 401, "TOKEN_INVALID");

  // Fetch user data from Firestore for role and completion status
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      // If user doc doesn't exist yet (e.g. during signup), proceed with minimal info
      return {
        userId: uid,
        email: decoded.email || undefined,
        role: "user",
        isProfileComplete: false,
      };
    }

    const userData = userDoc.data() || {};
    return {
      userId: uid,
      email: userData.email || decoded.email || undefined,
      role: userData.role || "user",
      isProfileComplete: !!userData.isProfileComplete,
      banned: !!userData.banned,
    };
  } catch (err) {
    console.error(`Auth lookup failed for ${uid}:`, err);
    throw new AuthError("Failed to verify user status", 500, "AUTH_INTERNAL_ERROR");
  }
}
