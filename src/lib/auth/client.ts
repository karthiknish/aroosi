/**
 * Auth client utilities (cookie/session model)
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
  const res = await postJson<SigninResponse>("/api/auth/signin", params, { cache: "no-store" });
  return res;
}

export async function signup(params: {
  email: string;
  password: string;
  fullName: string;
  profile: Record<string, unknown>;
}) {
  const res = await postJson<SigninResponse>("/api/auth/signup", params, { cache: "no-store" });
  return res;
}

/**
 * For Google, the server expects either an ID token or user info JSON in "credential",
 * and a CSRF/state string in "state".
 */
export async function googleAuth(params: { credential: string; state: string }) {
  const res = await postJson<SigninResponse>("/api/auth/google", params, { cache: "no-store" });
  return res;
}

export async function logout() {
  // Best-effort notify server (idempotent endpoint)
  try {
    await postJson<{ message: string }>("/api/auth/logout", undefined, { cache: "no-store" });
  } catch {
    // ignore network errors
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
export async function resetPassword(params: { email: string; password: string }) {
  return postJson<{ message?: string }>(
    "/api/auth/reset-password",
    params,
    { cache: "no-store" }
  );
}

/**
 * Accessors for current tokens (for diagnostics/UI)
 */
export function getAccessToken(): string | null {
  return null;
}
export function getRefreshToken(): string | null {
  return null;
}