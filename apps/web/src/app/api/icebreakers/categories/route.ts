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
  active?: boolean;
}

export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    try {
      const snapshot = await db
        .collection("icebreakerQuestions")
        .where("active", "==", true)
        .get();

      const categories = new Map<string, { id: string; name: string; questions: Array<{ id: string; question: string; text: string; category: string }> }>();

      snapshot.forEach((doc: any) => {
        const data = doc.data() as IcebreakerQuestionDoc;
        const category = typeof data.category === "string" && data.category.trim().length > 0
          ? data.category.trim()
          : "general";
        const existing = categories.get(category) || {
          id: category,
          name: category,
          questions: [],
        };

        existing.questions.push({
          id: doc.id,
          question: data.text || "",
          text: data.text || "",
          category,
        });
        categories.set(category, existing);
      });

      return successResponse(
        [...categories.values()].map((category) => ({
          ...category,
          count: category.questions.length,
        })),
        200,
        ctx.correlationId
      );
    } catch (error) {
      console.error("icebreakers/categories GET error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch icebreaker categories", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    requireAuth: false,
    rateLimit: { identifier: "icebreakers_categories_get", maxRequests: 120 },
  }
);