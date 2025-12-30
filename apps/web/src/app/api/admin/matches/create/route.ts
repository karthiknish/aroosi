import { createAuthenticatedHandler, successResponse, errorResponse } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/api/admin";
import { devLog } from "@/app/api/_utils/auth";
import { Notifications } from "@/lib/notify";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { adminCreateMatchBodySchema } from "@/lib/validation/apiSchemas/adminMatches";

export const POST = createAuthenticatedHandler(
  async (ctx, body: import("zod").infer<typeof adminCreateMatchBodySchema>) => {
    const startedAt = nowTimestamp();
    const admin = requireAdmin(ctx);
    if (!admin.ok) return admin.response;

    const fromProfileId = body.fromProfileId ?? body.user1Id;
    const toProfileId = body.toProfileId ?? body.user2Id;
    if (!fromProfileId || !toProfileId) {
      return errorResponse("Invalid profile IDs", 400, {
        correlationId: ctx.correlationId,
      });
    }
    try {
      const fromProfileDoc = await db.collection("users").doc(fromProfileId).get();
      const toProfileDoc = await db.collection("users").doc(toProfileId).get();
      if (!fromProfileDoc.exists || !toProfileDoc.exists) {
        return errorResponse("Profile not found", 404, {
          correlationId: ctx.correlationId,
        });
      }

      const fromProfile: any = fromProfileDoc.data();
      const toProfile: any = toProfileDoc.data();
      const fromUserId = fromProfile.id || fromProfileDoc.id;
      const toUserId = toProfile.id || toProfileDoc.id;

    // Helper to upsert an accepted interest
    const upsertAcceptedInterest = async (fromUser: string, toUser: string) => {
      const existingSnap = await db
        .collection("interests")
        .where("fromUserId", "==", fromUser)
        .where("toUserId", "==", toUser)
        .limit(1)
        .get();
      if (!existingSnap.empty) {
        const docRef = existingSnap.docs[0].ref;
        const data = existingSnap.docs[0].data();
        if (data.status !== "accepted")
          await docRef.update({ status: "accepted" });
        return docRef.id;
      }
      const docRef = await db.collection("interests").add({
        fromUserId: fromUser,
        toUserId: toUser,
        status: "accepted",
        createdAt: nowTimestamp(),
      });
      return docRef.id;
    };

    await upsertAcceptedInterest(fromUserId, toUserId);
    await upsertAcceptedInterest(toUserId, fromUserId);

    // Create match if not exists
    const m1 = await db
      .collection("matches")
      .where("user1Id", "==", fromUserId)
      .where("user2Id", "==", toUserId)
      .limit(1)
      .get();
    const m2 = await db
      .collection("matches")
      .where("user1Id", "==", toUserId)
      .where("user2Id", "==", fromUserId)
      .limit(1)
      .get();
    if (m1.empty && m2.empty) {
      const conversationId = [fromUserId, toUserId].sort().join("_");
      await db.collection("matches").add({
        user1Id: fromUserId,
        user2Id: toUserId,
        status: "matched",
        createdAt: nowTimestamp(),
        conversationId,
      });
    }

      void (async () => {
        try {
          if (fromProfile.email && toProfile.email) {
            await Promise.all([
              Notifications.newMatch(
                fromProfile.email,
                fromProfile.fullName || "",
                toProfile.fullName || "A user"
              ),
              Notifications.newMatch(
                toProfile.email,
                toProfile.fullName || "",
                fromProfile.fullName || "A user"
              ),
            ]);
          }
        } catch (e) {
          devLog("error", "admin.matches_create", "match_email_send_error", {
            correlationId: ctx.correlationId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      })();

      devLog("info", "admin.matches_create", "success", {
        correlationId: ctx.correlationId,
        statusCode: 200,
        durationMs: nowTimestamp() - startedAt,
        fromProfileId,
        toProfileId,
      });
      return successResponse({ created: true }, 200, ctx.correlationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      devLog("error", "admin.matches_create", "unhandled_error", {
        correlationId: ctx.correlationId,
        statusCode: 500,
        durationMs: nowTimestamp() - startedAt,
        message,
      });
      return errorResponse("Failed to create match", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    bodySchema: adminCreateMatchBodySchema,
    rateLimit: { identifier: "admin_matches_create", maxRequests: 60, windowMs: 60 * 60 * 1000 },
  }
);
