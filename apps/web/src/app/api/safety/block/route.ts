import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  errorResponsePublic,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { COL_RECOMMENDATIONS } from "@/lib/firestoreSchema";

const blockSchema = z.object({
  blockedUserId: z.string().min(1, "blockedUserId is required"),
});

// In-memory short cooldown map per (blocker, target)
const perTargetCooldown = new Map<string, number>();

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof blockSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { blockedUserId } = body;

    // Prevent self-blocking
    if (userId === blockedUserId) {
      return errorResponsePublic("Cannot block yourself", 400);
    }

    // Per-target cooldown: prevent repeated blocks within 60 seconds
    const key = `${userId}_${blockedUserId}`;
    const now = Date.now();
    const last = perTargetCooldown.get(key) || 0;
    if (now - last < 60_000) {
      return errorResponsePublic("Please wait before blocking this user again", 429);
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

      perTargetCooldown.set(key, now);

      // Invalidate recommendation cache
      try {
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
    rateLimit: { identifier: "safety_block", maxRequests: 20 }
  }
);
