import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { db } from "@/lib/firebaseAdmin";

/**
 * POST /api/push/unregister
 * 
 * Unregister a push notification token for the current user.
 * Also supports DELETE for clients that prefer that method.
 */
export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    let body: any = {};
    try {
      body = await ctx.request.json();
    } catch {}
    
    const { token, playerId } = body;
    const id = String(playerId || token || "").trim();
    
    if (!id) {
      return errorResponse("Missing playerId/token", 400, { correlationId: ctx.correlationId });
    }

    try {
      const docId = id.slice(0, 140);
      await db.collection("pushTokens").doc(docId).set(
        {
          userId,
          playerId: id,
          token: token || undefined,
          isActive: false,
          unregisteredAt: nowTimestamp(),
        },
        { merge: true }
      );
      
      return successResponse({
        message: "Push token unregistered",
        playerId: id,
        unregisteredAt: nowTimestamp(),
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("push/unregister POST error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to unregister push token", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "push_unregister", maxRequests: 30 }
  }
);

// Also support DELETE method
export const DELETE = POST;
