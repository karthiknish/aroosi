/**
 * Auth client utilities using Clerk API
 * - Provides helpers to call API endpoints and normalize responses
 * - Exposes logout for server-side session invalidation
 */

import { postJson } from "../http/client";
import { SignOutCallback } from "@clerk/types";

type SigninResponse = {
  status?: string;
  message?: string;
  user?: unknown;
  redirectTo?: string;
  refreshed?: boolean;
  code?: string;
};

export async function signin(params: { email: string; password: string }) {
  // For Clerk integration, we'll use the existing API route but enhance it
  const res = await postJson<SigninResponse>("/api/auth/signin", params, {
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

export async function logout(callback?: SignOutCallback) {
  // Sign out from Clerk and notify server (idempotent endpoint)
  try {
    // Dynamic import to avoid SSR issues; signOut exists on the module
    const clerkModule: any = await import("@clerk/nextjs");
    const signOutFunc: any =
      clerkModule.signOut || clerkModule?.default?.signOut;
    if (typeof signOutFunc === "function") {
      await signOutFunc({ redirectUrl: "/sign-in" });
    } else {
      // Fallback to window.location for client-side redirect
      if (typeof window !== "undefined") {
        window.location.href = "/sign-in";
      }
    }

    // Best-effort notify server
    await postJson<{ message: string }>("/api/auth/logout", undefined, {
      cache: "no-store",
    });
  } catch (error) {
    console.error("Logout error:", error);
    // Even if Clerk sign out fails, still call the callback if provided
    if (callback) {
      callback();
    }
  }
}

/**
 * Public: trigger forgot password email
 */
export async function forgotPassword(email: string) {
  return postJson<{ message?: string }>(
    "/api/auth/forgot-password",
    { email },
    { cache: "no-store" }
  );
}

/**
 * Public: reset password
 */
export async function resetPassword(params: {
  email: string;
  password: string;
}) {
  return postJson<{ message?: string }>("/api/auth/reset-password", params, {
    cache: "no-store",
  });
}

/**
 * Accessors for current tokens using Clerk
 */
export async function getAccessToken(): Promise<string | null> {
  // Client-side function should not import server modules
  // Return null or implement client-side token retrieval
  return null;
}

export async function getRefreshToken(): Promise<string | null> {
  // Clerk handles token refresh automatically, so we don't expose refresh tokens directly
  return null;
}