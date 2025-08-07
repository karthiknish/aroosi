/**
 * Auth client utilities for pure token model.
 * - Persists tokens to localStorage
 * - Provides helpers to call API endpoints and normalize responses
 * - Exposes logout to clear tokens
 *
 * Use in UI event handlers (sign-in/sign-up flows).
 *
 * Also includes public helpers for forgot/reset password.
 */

import { tokenStorage, postJson } from "../http/client";

type SigninResponse = {
  status?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id?: string;
    email?: string;
    role?: string;
    name?: string;
    profile?: unknown;
  };
  redirectTo?: string;
  refreshed?: boolean;
  code?: string;
};

export async function signin(params: { email: string; password: string }) {
  const res = await postJson<SigninResponse>("/api/auth/signin", params, { cache: "no-store" });
  if (res?.accessToken) tokenStorage.access = res.accessToken || null;
  if (res?.refreshToken) tokenStorage.refresh = res.refreshToken || null;
  return res;
}

export async function signup(params: {
  email: string;
  password: string;
  fullName: string;
  profile: Record<string, unknown>;
}) {
  const res = await postJson<SigninResponse>("/api/auth/signup", params, { cache: "no-store" });
  if (res?.accessToken) tokenStorage.access = res.accessToken || null;
  if (res?.refreshToken) tokenStorage.refresh = res.refreshToken || null;
  return res;
}

/**
 * For Google, the server expects either an ID token or user info JSON in "credential",
 * and a CSRF/state string in "state".
 */
export async function googleAuth(params: { credential: string; state: string }) {
  const res = await postJson<SigninResponse>("/api/auth/google", params, { cache: "no-store" });
  if (res?.accessToken) tokenStorage.access = res.accessToken || null;
  if (res?.refreshToken) tokenStorage.refresh = res.refreshToken || null;
  return res;
}

export async function logout() {
  tokenStorage.clearAll();
  // Best-effort notify server (idempotent endpoint)
  try {
    await postJson<{ message: string }>("/api/auth/logout", undefined, { cache: "no-store", noRefresh: true, skipAuth: true });
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
    { cache: "no-store", noRefresh: true, skipAuth: true }
  );
}

/**
 * Public: reset password
 */
export async function resetPassword(params: { email: string; password: string }) {
  return postJson<{ message?: string }>(
    "/api/auth/reset-password",
    params,
    { cache: "no-store", noRefresh: true, skipAuth: true }
  );
}

/**
 * Accessors for current tokens (for diagnostics/UI)
 */
export function getAccessToken(): string | null {
  return tokenStorage.access;
}
export function getRefreshToken(): string | null {
  return tokenStorage.refresh;
}