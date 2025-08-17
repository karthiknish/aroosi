import { cookies } from "next/headers";
import { verifyFirebaseIdToken, getFirebaseUser } from "@/lib/firebaseAdmin";
import { NextRequest } from "next/server";

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
    isProfileComplete: boolean;
    isOnboardingComplete: boolean;
  } | null;
}

// Utility to get the authenticated user from Firebase token
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    // Get the Firebase ID token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("firebaseAuthToken")?.value;
    
    if (!token) {
      return null;
    }
    
    // Verify the Firebase ID token
    const decodedToken = await verifyFirebaseIdToken(token);
    const userId = decodedToken.uid;
    
    if (!userId) {
      return null;
    }
    
    // Get the user data from Firestore
    const userData = await getFirebaseUser(userId);
    if (!userData) {
      return null;
    }
    
    // Return user data with profile
    return {
      id: userId,
      email: userData.email || "",
      role: userData.role || "user",
      emailVerified: userData.emailVerified || false,
      createdAt: userData.createdAt || Date.now(),
      fullName: userData.fullName || userData.displayName || undefined,
      profile: userData
        ? {
            id: userId,
            fullName: userData.fullName || undefined,
            isProfileComplete: Boolean(userData.isProfileComplete ?? false),
            isOnboardingComplete: Boolean(userData.isOnboardingComplete ?? false),
          }
        : null,
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}

// Internal indirection to allow test overrides without brittle jest module hoisting issues
let getUserFn: () => Promise<AuthenticatedUser | null> = getAuthenticatedUser;

// Test-only helper (harmless in prod) to override user retrieval
export function __setGetAuthenticatedUserForTests(fn: () => Promise<AuthenticatedUser | null>) {
  getUserFn = fn;
}

// Utility to protect API routes with Firebase authentication
export function withFirebaseAuth(handler: (user: AuthenticatedUser, request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    try {
      const user = await getUserFn();
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid or missing authentication token" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      return handler(user, request);
    } catch (error) {
      console.error("Error in withFirebaseAuth:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  };
}