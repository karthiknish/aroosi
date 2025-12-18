import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { searchParams } = new URL(ctx.request.url);
    
    let fromUserId = searchParams.get("fromUserId");
    let toUserId = searchParams.get("toUserId");
    const targetUserId = searchParams.get("targetUserId");

    // Backward compatibility: if client only supplies targetUserId, infer direction
    if (!fromUserId && !toUserId && targetUserId) {
      fromUserId = userId;
      toUserId = targetUserId;
    }

    if (!fromUserId || !toUserId) {
      return errorResponse(
        "Missing fromUserId/toUserId or targetUserId parameter",
        400,
        { correlationId: ctx.correlationId }
      );
    }

    if (fromUserId !== userId && toUserId !== userId) {
      console.warn("Unauthorized interest status access", {
        authUserId: userId,
        attemptedFromUserId: fromUserId,
        attemptedToUserId: toUserId,
        correlationId: ctx.correlationId,
      });
      return errorResponse(
        "Unauthorized: can only check interest status involving yourself",
        403,
        { correlationId: ctx.correlationId }
      );
    }

    try {
      // Fetch interest doc from from->to
      const interestSnap = await db
        .collection("interests")
        .where("fromUserId", "==", fromUserId)
        .where("toUserId", "==", toUserId)
        .limit(1)
        .get();
      const interest = interestSnap.empty ? null : interestSnap.docs[0].data();

      if (!interest) {
        return successResponse({ status: null }, 200, ctx.correlationId);
      }

      let status = interest.status as string | null;
      if (status === "accepted") {
        // Check reverse acceptance for mutual convenience flag
        const reverseSnap = await db
          .collection("interests")
          .where("fromUserId", "==", toUserId)
          .where("toUserId", "==", fromUserId)
          .where("status", "==", "accepted")
          .limit(1)
          .get();
        if (!reverseSnap.empty) status = "mutual";
      }
      
      return successResponse({ status }, 200, ctx.correlationId);
    } catch (error) {
      console.error("interests/status GET error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch interest status", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "interests_status", maxRequests: 200 }
  }
);
