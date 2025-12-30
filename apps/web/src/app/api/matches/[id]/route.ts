import { db } from "@/lib/firebaseAdmin";
import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/matches/[id]
 * Get a specific match by ID
 */
export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext, _body: unknown, routeCtx?: RouteContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { id: matchId } = await (routeCtx?.params || Promise.resolve({ id: "" }));

    if (!matchId) {
      return errorResponse("Match ID is required", 400, { correlationId: ctx.correlationId });
    }

    try {
      const matchDoc = await db.collection("matches").doc(matchId).get();
      
      if (!matchDoc.exists) {
        return errorResponse("Match not found", 404, { correlationId: ctx.correlationId });
      }

      const match = matchDoc.data()!;
      
      // Verify user is part of this match
      if (match.user1Id !== userId && match.user2Id !== userId) {
        return errorResponse("Not authorized to view this match", 403, { correlationId: ctx.correlationId });
      }

      // Get the other user's profile
      const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
      const userDoc = await db.collection("users").doc(otherUserId).get();
      const profile = userDoc.exists ? userDoc.data() : {};

      return successResponse({
        id: matchDoc.id,
        userId: otherUserId,
        fullName: profile?.fullName ?? null,
        profileImageUrls: profile?.profileImageUrls ?? [],
        createdAt: match.createdAt ?? Date.now(),
        status: match.status,
      }, 200, ctx.correlationId);
    } catch (e) {
      console.error("matches/[id] GET error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch match", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "matches_get_one", maxRequests: 50 }
  }
);

/**
 * DELETE /api/matches/[id]
 * Delete/unmatch a specific match
 */
export const DELETE = createAuthenticatedHandler(
  async (ctx: ApiContext, _body: unknown, routeCtx?: RouteContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { id: matchId } = await (routeCtx?.params || Promise.resolve({ id: "" }));

    if (!matchId) {
      return errorResponse("Match ID is required", 400, { correlationId: ctx.correlationId });
    }

    try {
      const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();
      
      if (!matchDoc.exists) {
        return errorResponse("Match not found", 404, { correlationId: ctx.correlationId });
      }

      const match = matchDoc.data()!;
      
      // Verify user is part of this match
      if (match.user1Id !== userId && match.user2Id !== userId) {
        return errorResponse("Not authorized to delete this match", 403, { correlationId: ctx.correlationId });
      }

      // Option 1: Hard delete
      // await matchRef.delete();

      // Option 2: Soft delete - mark as unmatched
      await matchRef.set({
        status: "unmatched",
        unmatchedBy: userId,
        unmatchedAt: Date.now(),
      }, { merge: true });

      console.info("matches/[id] DELETE success", {
        scope: "matches",
        type: "unmatched",
        correlationId: ctx.correlationId,
        matchId,
        unmatchedBy: userId,
      });

      return successResponse({ 
        deleted: true, 
        matchId,
        message: "Match removed successfully" 
      }, 200, ctx.correlationId);
    } catch (e) {
      console.error("matches/[id] DELETE error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to delete match", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "matches_delete", maxRequests: 20 }
  }
);
