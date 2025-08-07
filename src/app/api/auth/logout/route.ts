import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/logout (Convex cookie session)
 * - No Authorization header expected; Convex clears session via its cookie-based auth.
 * - Always returns 200 and sets Cache-Control: no-store.
 */
export async function POST(request: NextRequest) {
  const scope = "auth.logout#POST";
  const correlationId =
    request.headers.get("x-request-id") ||
    Math.random().toString(36).slice(2, 10);

  try {
    // If you expose a Convex signOut action/mutation, call it here.
    // Otherwise, client-side clearing + server cookie invalidation (if configured) is enough.
    // Example (pseudocode):
    // await fetchMutation(api.auth.signOut, {});
  } catch (e) {
    console.warn(`${scope}: signOut skipped`, {
      correlationId,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  return NextResponse.json(
    { status: "ok", correlationId },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
