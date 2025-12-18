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
    
    const targetProfileId = searchParams.get("profileId");
    const targetUserIdParam = searchParams.get("userId");

    if (!targetProfileId && !targetUserIdParam) {
      return errorResponse("Missing profileId or userId parameter", 400, { correlationId: ctx.correlationId });
    }

    // Resolve target user ID
    let targetUserId = targetUserIdParam || "";
    if (targetProfileId && !targetUserIdParam) {
      // Treat profileId as userId if direct mapping absent
      targetUserId = targetProfileId;
    }
    
    if (!targetUserId) {
      return errorResponse("Target user not resolved", 404, { correlationId: ctx.correlationId });
    }

    try {
      // Check both directions
      const forwardDocId = `${userId}_${targetUserId}`;
      const reverseDocId = `${targetUserId}_${userId}`;
      const [forwardSnap, reverseSnap] = await Promise.all([
        db.collection("blocks").doc(forwardDocId).get(),
        db.collection("blocks").doc(reverseDocId).get(),
      ]);
      
      const isBlocked = forwardSnap.exists;
      const isBlockedBy = reverseSnap.exists;
      const canInteract = !isBlocked && !isBlockedBy;

      return successResponse({ isBlocked, isBlockedBy, canInteract }, 200, ctx.correlationId);
    } catch (e) {
      console.error("safety/blocked/check error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to check block status", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "safety_blocked_check", maxRequests: 100 }
  }
);
