import { db } from "@/lib/firebaseAdmin";
import { 
  createAuthenticatedHandler, 
  errorResponse, 
  successResponse,
  AuthenticatedApiContext
} from "@/lib/api/handler";
import { NextRequest } from "next/server";
import { nowTimestamp } from "@/lib/utils/timestamp";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Fetch a specific match
export const GET = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, _req: NextRequest, routeCtx?: RouteContext) => {
  try {
    if (!routeCtx) return errorResponse("Missing context", 400);
    const { id } = await routeCtx.params;
    const userId = ctx.user.id;

    const matchSnap = await db.collection("matches").doc(id).get();

    if (!matchSnap.exists) {
      return errorResponse("Match not found", 404, { correlationId: ctx.correlationId });
    }

    const match = matchSnap.data() as any;

    if (!match.userIds.includes(userId)) {
      return errorResponse("Unauthorized access to match", 403, { correlationId: ctx.correlationId });
    }

    const otherUserId = match.userIds.find((uid: string) => uid !== userId);
    const profileSnap = await db.collection("users").doc(otherUserId).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;

    return successResponse({
      id: matchSnap.id,
      userId: otherUserId,
      fullName: profile?.fullName ?? null,
      profileImageUrls: profile?.profileImageUrls ?? [],
      createdAt: match.createdAt ?? nowTimestamp(),
      status: match.status,
    }, 200, ctx.correlationId);
  } catch (e) {
    console.error("matches/[id] GET error", e);
    return errorResponse("Failed to fetch match", 500, { correlationId: ctx.correlationId });
  }
});

// DELETE: Unmatch
export const DELETE = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, _req: NextRequest, routeCtx?: RouteContext) => {
  try {
    if (!routeCtx) return errorResponse("Missing context", 400);
    const { id } = await routeCtx.params;
    const userId = ctx.user.id;

    const matchRef = db.collection("matches").doc(id);
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) {
      return errorResponse("Match not found", 404, { correlationId: ctx.correlationId });
    }

    const match = matchSnap.data() as any;

    if (!match.userIds.includes(userId)) {
      return errorResponse("Unauthorized to unmatch", 403, { correlationId: ctx.correlationId });
    }

    if (match.status === "unmatched") {
      return successResponse({ ok: true, alreadyUnmatched: true }, 200, ctx.correlationId);
    }

    await matchRef.set({
      status: "unmatched",
      unmatchedBy: userId,
      unmatchedAt: nowTimestamp(),
    }, { merge: true });

    console.info("matches/[id] DELETE success", {
      matchId: id,
      userId,
      correlationId: ctx.correlationId
    });

    return successResponse({ ok: true }, 200, ctx.correlationId);
  } catch (e) {
    console.error("matches/[id] DELETE error", e);
    return errorResponse("Failed to unmatch", 500, { correlationId: ctx.correlationId });
  }
});
