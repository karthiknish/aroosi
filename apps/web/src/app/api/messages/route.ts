import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { listConversationMessages } from "@/lib/messages/firebaseMessages";

// Note: GET routes don't use bodySchema - use query params validation instead

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const { searchParams } = new URL(ctx.request.url);
    const conversationId = searchParams.get("conversationId");
    const limitParam = searchParams.get("limit");
    const beforeParam = searchParams.get("before");

    if (!conversationId) {
      return errorResponse("Missing conversationId", 400, { correlationId: ctx.correlationId });
    }

    let limit: number | undefined;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
        return errorResponse("Invalid limit parameter (1-100)", 400, {
          correlationId: ctx.correlationId,
        });
      }
      limit = parsed;
    }

    let before: number | undefined;
    if (beforeParam) {
      const parsed = parseInt(beforeParam, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        return errorResponse("Invalid before parameter", 400, { correlationId: ctx.correlationId });
      }
      before = parsed;
    }

    try {
      const messages = await listConversationMessages(
        conversationId,
        limit,
        before
      );
      return successResponse({ messages }, 200, ctx.correlationId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("messages GET error", {
        error: msg,
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to fetch messages", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    rateLimit: { identifier: "messages_get", maxRequests: 60 }
  }
);
