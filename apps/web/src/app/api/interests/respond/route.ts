import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  errorResponsePublic,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { db } from "@/lib/firebaseAdmin";
import { deterministicMatchId, buildMatch } from "@/lib/firestoreSchema";
import { interestsRespondOnlySchema } from "@/lib/validation/apiSchemas/interests";

function normaliseInterestResponseStatus(status: string): "accepted" | "rejected" {
  if (status === "accepted") return "accepted";
  // Treat legacy/alternate decline labels as the canonical stored value.
  return "rejected";
}

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof interestsRespondOnlySchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { interestId } = body;
    const status = normaliseInterestResponseStatus(String(body.status));

    try {
      // Load interest
      const interestDoc = await db.collection("interests").doc(interestId).get();
      if (!interestDoc.exists) {
        return errorResponse("Interest not found", 404, { correlationId: ctx.correlationId });
      }
      
      const interest = interestDoc.data() as any;
      if (interest.toUserId !== userId) {
        return errorResponse("Unauthorized to respond to this interest", 403, { correlationId: ctx.correlationId });
      }
      
      // Block guard
      const blockId1 = `${interest.fromUserId}_${interest.toUserId}`;
      const blockId2 = `${interest.toUserId}_${interest.fromUserId}`;
      const [b1, b2] = await Promise.all([
        db.collection("blocks").doc(blockId1).get(),
        db.collection("blocks").doc(blockId2).get(),
      ]);
      if (b1.exists || b2.exists) {
        return errorResponsePublic("Cannot respond to blocked user", 403);
      }
      
      // Update status
      await interestDoc.ref.update({ status, updatedAt: nowTimestamp() });
      
      if (status === "accepted") {
        const matchId = deterministicMatchId(interest.fromUserId, interest.toUserId);
        const matchDoc = await db.collection("matches").doc(matchId).get();
        if (!matchDoc.exists) {
          const match = buildMatch(interest.fromUserId, interest.toUserId);
          await db.collection("matches").doc(matchId).set(match, { merge: true });
        }
      }
      
      return successResponse({ status }, 200, ctx.correlationId);
    } catch (error) {
      console.error("interests/respond POST error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to respond to interest", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: interestsRespondOnlySchema,
    rateLimit: { identifier: "interests_respond", maxRequests: 60, windowMs: 600000 }
  }
);
