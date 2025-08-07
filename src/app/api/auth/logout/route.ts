import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/**
 * POST /api/auth/logout
 * Pure token model: expects the refresh token in Authorization: Bearer <refreshToken>
 * Server should invalidate/blacklist the provided refresh token (best-effort).
 * Always returns 200 to avoid leaking token validity.
 */
export async function POST(request: NextRequest) {
  const scope = "auth.logout#POST";
  const correlationId =
    request.headers.get("x-request-id") ||
    Math.random().toString(36).slice(2, 10);

  try {
    const auth = request.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const refreshToken = m ? m[1] : undefined;

    if (!refreshToken) {
      // No token provided; still respond 200 to avoid enumeration/leaks
      return NextResponse.json(
        { status: "ok", correlationId },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Best-effort revocation placeholder:
    // If you add a Convex mutation for revocation, call it here.
    // For now, swallow and proceed to return 200 for idempotent logout.
    try {
      // await fetchMutation(api.auth.revokeRefreshToken, { refreshToken, correlationId });
    } catch (e) {
      console.warn(`${scope}: revoke skipped`, {
        correlationId,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    return NextResponse.json(
      { status: "ok", correlationId },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.warn(`${scope}: unhandled`, {
      correlationId,
      message: error instanceof Error ? error.message : String(error),
    });
    // Still return 200; logout is client-driven and should clear locally regardless
    return NextResponse.json(
      { status: "ok", correlationId },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
