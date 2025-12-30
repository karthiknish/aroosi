import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { markMessagesRead } from "@/lib/messages/firebaseMessages";
import { messageMarkReadSchema } from "@/lib/validation/apiSchemas/messages";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof messageMarkReadSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const startedAt = nowTimestamp();
    
    try {
      const { conversationId } = body;
      
      // Validate user is part of conversation
      const users = conversationId.split("_");
      if (!users.includes(userId)) {
        return errorResponse("Unauthorized", 403, { correlationId: ctx.correlationId });
      }
      
      const { updated, readAt } = await markMessagesRead(conversationId, userId);
      
      return successResponse(
        { updated, readAt, durationMs: nowTimestamp() - startedAt },
        200,
        ctx.correlationId
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("messages/mark-read error", {
        error: message,
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to mark messages read", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    bodySchema: messageMarkReadSchema,
    rateLimit: { identifier: "messages_mark_read", maxRequests: 60 }
  }
);
