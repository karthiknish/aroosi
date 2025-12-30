import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  errorResponsePublic,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { COL_RECOMMENDATIONS } from "@/lib/firestoreSchema";
import { blockSchema } from "@/lib/validation/apiSchemas/safety";

// Use createAuthenticatedHandler with per-target rate limiting
export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof blockSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { blockedUserId } = body;

    // Prevent self-blocking
    if (userId === blockedUserId) {
      return errorResponsePublic("Cannot block yourself", 400);
    }

    try {
      // Persist block relation in Firestore
      const docId = `${userId}_${blockedUserId}`;
      await db.collection("blocks").doc(docId).set(
        {
          blockerId: userId,
          blockedUserId,
          createdAt: Date.now(),
        },
        { merge: true }
      );

      // Invalidate recommendation cache
      try {
        const now = Date.now();
        const snaps = await db
          .collection(COL_RECOMMENDATIONS)
          .where("userId", "in", [userId, blockedUserId])
          .where("expiresAt", ">", now - 30 * 60 * 1000)
          .get();
        if (!snaps.empty) {
          const batch = db.batch();
          snaps.docs.forEach((d: any) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn("recs_cache_invalidate_failed", e);
      }

      return successResponse({ message: "User blocked successfully" }, 200, ctx.correlationId);
    } catch (e) {
      console.error("safety/block error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to block user", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: blockSchema,
    rateLimit: [
      { 
        identifier: "safety_block", 
        maxRequests: 20 
      },
      {
        identifier: "safety_block_target",
        maxRequests: 1,
        windowMs: 60000,
        getIdentifier: (ctx, body) => `block_target_${(ctx.user as any).id}_${body.blockedUserId}`,
        message: "Please wait before blocking this user again"
      }
    ]
  }
);
