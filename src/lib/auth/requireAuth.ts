import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdminInit";
import { DocumentSnapshot } from "firebase-admin/firestore";

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
  // Accept either Authorization: Bearer <idToken> or firebaseAuthToken cookie
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  let idToken: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    idToken = authHeader.slice(7).trim();
  } else {
    // Fallback to cookie name used elsewhere
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|; )firebaseAuthToken=([^;]+)/);
    if (match) idToken = decodeURIComponent(match[1]);
  }

  if (!idToken) {
    throw new AuthError("Missing authentication token", 401, "UNAUTHENTICATED");
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (e: any) {
    const code =
      e?.code === "auth/id-token-expired" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
    throw new AuthError("Invalid authentication token", 401, code);
  }

  const uid = decoded.uid;
  if (!uid) throw new AuthError("Invalid token payload", 401, "TOKEN_INVALID");

  // Fetch user doc (assuming users collection, doc id = uid)
  let snap: DocumentSnapshot | undefined;
  try {
    snap = await adminDb.collection("users").doc(uid).get();
  } catch {
    throw new AuthError("Failed to load user", 500, "USER_LOOKUP_FAILED");
  }
  if (!snap?.exists) {
    throw new AuthError("User not found", 404, "USER_NOT_FOUND");
  }
  const data: any = snap.data() || {};
  return {
    userId: uid,
    email: data.email || decoded.email || undefined,
    role: data.role || "user",
  };
}
