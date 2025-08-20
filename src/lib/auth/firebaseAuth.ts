import { cookies } from "next/headers";
import { verifyFirebaseIdToken, getFirebaseUser } from "@/lib/firebaseAdmin";
import { NextRequest } from "next/server";

/**
 * Unified Firebase auth utilities.
 * Supports both cookie (firebaseAuthToken) and Authorization: Bearer <token> header.
 * Prefer passing the NextRequest to getAuthenticatedUser so header fallback works
 * even outside the withFirebaseAuth wrapper (e.g. ensureAdmin, background tasks).
 */

// Type for the authenticated user
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: number;
  fullName?: string;
  profile: {
    id: string;
    fullName?: string;
  } | null;
}

// Utility to get the authenticated user from Firebase token (cookie or header)
export async function getAuthenticatedUser(
  req?: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    let token: string | undefined;
    // Header first (if request provided)
    if (req) {
      const authHeader =
        req.headers.get("authorization") || req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7).trim();
      if (!token) token = req.cookies.get("firebaseAuthToken")?.value;
    }
    // Fallback to global cookies (e.g. server components/tests)
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get("firebaseAuthToken")?.value;
    }
    if (!token) return null;

    const decodedToken = await verifyFirebaseIdToken(token);
    const userId = decodedToken.uid;
    if (!userId) return null;

    const userData = await getFirebaseUser(userId);
    if (!userData) return null;

    return {
      id: userId,
      email: userData.email || "",
      role: userData.role || "user",
      emailVerified: userData.emailVerified || false,
      createdAt: userData.createdAt || Date.now(),
      fullName: userData.fullName || userData.displayName || undefined,
      profile: userData
        ? { id: userId, fullName: userData.fullName || undefined }
        : null,
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}

// Internal indirection to allow test overrides without brittle jest module hoisting issues
type GetUserFn = (req?: NextRequest) => Promise<AuthenticatedUser | null>;
let getUserFn: GetUserFn = getAuthenticatedUser;

// Test-only helper (harmless in prod) to override user retrieval
export function __setGetAuthenticatedUserForTests(fn: GetUserFn) {
  getUserFn = fn;
}

// Utility to protect API routes with Firebase authentication
export function withFirebaseAuth(
  handler: (user: AuthenticatedUser, request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest) => {
    try {
      const user = await getUserFn(request);
      if (!user) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized: Invalid or missing authentication token",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      return handler(user, request);
    } catch (error) {
      console.error("Error in withFirebaseAuth:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}