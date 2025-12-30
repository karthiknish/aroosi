import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import {
  COL_TYPING_INDICATORS,
  buildTypingIndicator,
} from "@/lib/firestoreSchema";
import { typingIndicatorsSchema } from "@/lib/validation/apiSchemas/typingIndicators";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof typingIndicatorsSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { conversationId, action } = body;

    try {
      const docId = `${conversationId}_${userId}`;
      const indicator = buildTypingIndicator(conversationId, userId, action === "start");
      await db.collection(COL_TYPING_INDICATORS).doc(docId).set(indicator, { merge: true });

      // Emit SSE typing event
      try {
        const { eventBus } = await import("@/lib/eventBus");
        eventBus.emit(conversationId, {
          type: action === "start" ? "typing_start" : "typing_stop",
          conversationId,
          userId,
          at: Date.now(),
        });
      } catch {}

      return successResponse({
        message: `Typing indicator ${action}ed`,
        indicatorId: docId,
        conversationId,
        userId,
        action,
        isTyping: action === "start",
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("typing-indicators POST error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to update typing indicator", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: typingIndicatorsSchema,
    rateLimit: { identifier: "typing_indicators", maxRequests: 120 }
  }
);

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const { searchParams } = new URL(ctx.request.url);
    const conversationId = searchParams.get("conversationId");
    
    if (!conversationId) {
      return errorResponse("Missing conversationId", 400, { correlationId: ctx.correlationId });
    }

    try {
      const cutoff = Date.now() - 10000; // 10s window
      const snap = await db
        .collection(COL_TYPING_INDICATORS)
        .where("conversationId", "==", conversationId)
        .where("updatedAt", ">=", cutoff)
        .get();
      
      const typingUsers = snap.docs
        .map((d: any) => d.data() as any)
        .filter((d: any) => d.isTyping)
        .map((d: any) => d.userId);

      return successResponse({ conversationId, typingUsers }, 200, ctx.correlationId);
    } catch (error) {
      console.error("typing-indicators GET error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch typing indicators", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "typing_indicators_get", maxRequests: 200 }
  }
);
