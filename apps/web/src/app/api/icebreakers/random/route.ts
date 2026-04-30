import {
  createApiHandler,
  errorResponse,
  successResponse,
  ApiContext,
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

interface IcebreakerQuestionDoc {
  text?: string;
  category?: string;
}

export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    try {
      const snapshot = await db
        .collection("icebreakerQuestions")
        .where("active", "==", true)
        .get();

      if (snapshot.empty) {
        return errorResponse("No active icebreakers found", 404, {
          correlationId: ctx.correlationId,
        });
      }

      const questions = snapshot.docs.map((doc: any) => {
        const data = doc.data() as IcebreakerQuestionDoc;
        return {
          id: doc.id,
          question: data.text || "",
          text: data.text || "",
          category: data.category || "general",
        };
      });

      const selected = questions[Math.floor(Math.random() * questions.length)];
      return successResponse(selected, 200, ctx.correlationId);
    } catch (error) {
      console.error("icebreakers/random GET error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch random icebreaker", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    requireAuth: false,
    rateLimit: { identifier: "icebreakers_random_get", maxRequests: 120 },
  }
);