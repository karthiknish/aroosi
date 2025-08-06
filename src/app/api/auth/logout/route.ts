import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * Clear all auth cookies using centralized helper to ensure Domain/SameSite/Secure consistency.
 * Idempotent and safe to call even when no cookies are present.
 */
export async function POST(_request: NextRequest) {
  const res = NextResponse.json({ message: "Logged out successfully" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const { appendClearAuthCookies } = await import("@/lib/auth/cookies");
    appendClearAuthCookies(res);
  } catch {
    // best-effort; if helper import fails for any reason, do not throw
  }
  return res;
}
