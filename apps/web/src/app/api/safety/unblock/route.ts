import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { COL_RECOMMENDATIONS } from "@/lib/firestoreSchema";
import { unblockSchema } from "@/lib/validation/apiSchemas/safety";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof unblockSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { blockedUserId } = body;

    try {
      const docId = `${userId}_${blockedUserId}`;
      await db.collection("blocks").doc(docId).delete();

      // Invalidate recommendation cache (so previously filtered user can reappear)
      try {
        const snaps = await db
          .collection(COL_RECOMMENDATIONS)
          .where("userId", "==", userId)
          .get();
        if (!snaps.empty) {
          const batch = db.batch();
          snaps.docs.forEach((d: any) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn("recs_cache_invalidate_failed", e);
      }

      return successResponse({ message: "User unblocked successfully" }, 200, ctx.correlationId);
    } catch (e) {
      console.error("safety/unblock error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to unblock user", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: unblockSchema,
    rateLimit: { identifier: "safety_unblock", maxRequests: 20 }
  }
);
