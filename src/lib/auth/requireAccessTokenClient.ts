"use client";

/**
 * Client-only guard to ensure an access token is available before making
 * authenticated requests (e.g., calling /api/auth/me).
 *
 * Usage:
 *   const token = await waitForAccessToken();
 *   if (!token) { /* user not authenticated */ /* return; }
 *   // proceed with authenticated call
 */

export function getAccessToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
}

/**
 * Wait for an access token to appear in localStorage with a bounded timeout.
 * - Resolves with the token string if found within the timeout.
 * - Resolves with null if not found by the time the timeout elapses.
 *
 * Defaults:
 * - timeoutMs: 1500ms
 * - pollIntervalMs: 50ms
 */
export async function waitForAccessToken(
  timeoutMs = 1500,
  pollIntervalMs = 50
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const existing = getAccessToken();
  if (existing) return existing;

  const start = Date.now();
  return new Promise<string | null>((resolve) => {
    const check = () => {
      const token = getAccessToken();
      if (token) {
        resolve(token);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(check, pollIntervalMs);
    };
    check();
  });
}

/**
 * Boolean helper for quick checks in components.
 */
export async function hasAccessToken(timeoutMs = 0): Promise<boolean> {
  if (timeoutMs <= 0) {
    return !!getAccessToken();
  }
  const token = await waitForAccessToken(timeoutMs);
  return !!token;
}