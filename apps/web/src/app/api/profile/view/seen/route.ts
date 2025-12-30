import { NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext,
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";

/**
 * POST  /api/profile/view/seen
 * Marks all profile viewers as seen by updating the user's lastSeenViewersAt timestamp.
 */
export const POST = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  const { user, correlationId } = ctx;
  try {
    await db.collection("users").doc(user.id).set(
      { lastSeenViewersAt: nowTimestamp() },
      { merge: true }
    );

    return successResponse(undefined, 200, correlationId);
  } catch (err: any) {
    console.error("[profile.view.seen] fatal error", {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err?.message || "Failed to mark viewers as seen", 400, { correlationId });
  }
}, {
  rateLimit: { identifier: "profile_view_seen", maxRequests: 20 }
});

