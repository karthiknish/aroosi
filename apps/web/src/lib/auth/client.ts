/**
 * Auth client utilities using Firebase Auth
 * - Provides helpers to call API endpoints and normalize responses
 * - Exposes logout for server-side session invalidation
 */

import { postJson } from "../http/client";

type SigninResponse = {
  status?: string;
  message?: string;
  user?: unknown;
  redirectTo?: string;
  refreshed?: boolean;
  code?: string;
};

export async function signin(params: { email: string; password: string }) {
  // For Firebase integration, we'll use the existing API route
  const res = await postJson<SigninResponse>("/api/auth/login", params, {
    cache: "no-store",
  });
  return res;
}

// Signup disabled: route removed

/**
 * For Google, the server expects either an ID token or user info JSON in "credential",
 * and a CSRF/state string in "state".
 */
export async function googleAuth(params: {
  credential: string;
  state: string;
}) {
  const res = await postJson<SigninResponse>("/api/auth/google", params, {
    cache: "no-store",
  });
  return res;
}

export async function logout() {
  // Sign out from Firebase and notify server (idempotent endpoint)
  try {
    // Dynamic import to avoid SSR issues
    const firebaseModule: any = await import("firebase/auth");
    const signOutFunc: any = firebaseModule.signOut;
    
    if (typeof signOutFunc === "function") {
      // Get auth instance
  const { auth } = await import("@/lib/firebase");
      await signOutFunc(auth);
    }

    // Best-effort notify server
    await postJson<{ message: string }>("/api/auth/logout", undefined, {
      cache: "no-store",
    });
    
    // Client-side redirect
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  } catch (error) {
    console.error("Logout error:", error);
    // Fallback to client-side redirect
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  }
}

// Deprecated: password reset handled directly via Firebase (sendPasswordResetEmail / confirmPasswordReset)

/**
 * Accessors for current tokens using Firebase
 */
export async function getAccessToken(): Promise<string | null> {
  // Client-side function should not import server modules
  // Return null or implement client-side token retrieval
  return null;
}

export async function getRefreshToken(): Promise<string | null> {
  // Firebase handles token refresh automatically, so we don't expose refresh tokens directly
  return null;
}