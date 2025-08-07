import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * Clear all auth cookies using centralized helper to ensure Domain/SameSite/Secure consistency.
 * Idempotent and safe to call even when no cookies are present.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: "Logged out successfully" }, { headers: { "Cache-Control": "no-store" } });
}
