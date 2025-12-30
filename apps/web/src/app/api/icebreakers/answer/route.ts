import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { COL_USAGE_EVENTS } from "@/lib/firestoreSchema";
import { FieldValue } from "firebase-admin/firestore";
import { icebreakerAnswerSchema } from "@/lib/validation/apiSchemas/icebreakers";

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof icebreakerAnswerSchema>
  ) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { questionId, answer } = body;

    try {
      // Ensure question exists and is active
      const qDoc = await db.collection("icebreakerQuestions").doc(questionId).get();
      if (!qDoc.exists || qDoc.data()?.active === false) {
        return errorResponse("Invalid question", 400, { correlationId: ctx.correlationId });
      }
      
      const val = String(answer).trim();
      if (val.length === 0) {
        return errorResponse("Answer cannot be empty", 400, { correlationId: ctx.correlationId });
      }
      
      const existingSnap = await db
        .collection("userIcebreakerAnswers")
        .where("userId", "==", userId)
        .where("questionId", "==", questionId)
        .get();
      
      const now = Date.now();
      
      if (!existingSnap.empty) {
        // Update existing answer
        const docRef = existingSnap.docs[0].ref;
        await docRef.set(
          { userId, questionId, answer: val, createdAt: now },
          { merge: true }
        );
        return successResponse({ updated: true }, 200, ctx.correlationId);
      }
      
      // New answer
      await db.collection("userIcebreakerAnswers").add({
        userId,
        questionId,
        answer: val,
        createdAt: now,
      });
      
      // Increment answeredIcebreakersCount on user profile
      try {
        const userRef = db.collection("users").doc(String(userId));
        await userRef.set(
          { answeredIcebreakersCount: FieldValue.increment(1) },
          { merge: true }
        );
        
        // Record analytics event
        try {
          await db.collection(COL_USAGE_EVENTS).add({
            userId,
            feature: "icebreaker_answered",
            createdAt: now,
            context: { questionId },
          });
        } catch {}
      } catch {}
      
      return successResponse({ created: true, incremented: true }, 200, ctx.correlationId);
    } catch (error) {
      console.error("icebreakers/answer POST error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to submit answer", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: icebreakerAnswerSchema,
    rateLimit: { identifier: "icebreakers_answer", maxRequests: 50 }
  }
);
