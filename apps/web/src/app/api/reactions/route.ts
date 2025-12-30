import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { reactionToggleSchema } from "@/lib/validation/apiSchemas/reactions";

function makeReactionId(messageId: string, userId: string, emoji: string) {
  const enc = encodeURIComponent(emoji);
  return `${messageId}__${userId}__${enc}`;
}

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const { searchParams } = new URL(ctx.request.url);
    const conversationId = searchParams.get("conversationId") || "";
    const messageId = searchParams.get("messageId") || "";
    
    // Support both conversationId and messageId query params
    if (!conversationId && !messageId) {
      return errorResponse("conversationId or messageId is required", 400, { correlationId: ctx.correlationId });
    }

    try {
      let query = db.collection("reactions");
      
      if (messageId) {
        // Filter by specific message
        query = query.where("messageId", "==", messageId) as typeof query;
      } else {
        // Filter by conversation
        query = query.where("conversationId", "==", conversationId) as typeof query;
      }
      
      const snap = await query.get();
      
      const reactions = snap.docs.map((d: any) => {
        const r = d.data() as any;
        return {
          id: d.id,
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
          updatedAt: r.updatedAt || r.createdAt || Date.now(),
        };
      });
      
      return successResponse({ reactions }, 200, ctx.correlationId);
    } catch (error) {
      console.error("reactions GET error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to load reactions", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "reactions_get", maxRequests: 100 }
  }
);

// DELETE - Remove a reaction (explicit handler for clients using DELETE method)
export const DELETE = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof reactionToggleSchema>
  ) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { messageId, emoji } = body;

    try {
      const id = makeReactionId(messageId, String(userId), emoji);
      const ref = db.collection("reactions").doc(id);
      const existing = await ref.get();
      
      if (!existing.exists) {
        return errorResponse("Reaction not found", 404, { correlationId: ctx.correlationId });
      }
      
      await ref.delete();
      return successResponse({ removed: true }, 200, ctx.correlationId);
    } catch (error) {
      console.error("reactions DELETE error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to remove reaction", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: reactionToggleSchema,
    rateLimit: { identifier: "reactions_delete", maxRequests: 60 }
  }
);

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof reactionToggleSchema>
  ) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { messageId, emoji } = body;

    try {
      // Ensure message exists and get conversationId
      const msgRef = db.collection("messages").doc(messageId);
      const msgSnap = await msgRef.get();
      if (!msgSnap.exists) {
        return errorResponse("Message not found", 404, { correlationId: ctx.correlationId });
      }
      
      const msg = msgSnap.data() as any;
      const conversationId: string = msg.conversationId || "";
      if (!conversationId) {
        return errorResponse("Message missing conversationId", 400, { correlationId: ctx.correlationId });
      }

      const now = Date.now();
      const id = makeReactionId(messageId, String(userId), emoji);
      const ref = db.collection("reactions").doc(id);
      const existing = await ref.get();
      
      if (existing.exists) {
        // Toggle off -> delete
        await ref.delete();
        return successResponse({ removed: true }, 200, ctx.correlationId);
      }
      
      // Toggle on -> create
      await ref.set({
        messageId,
        conversationId,
        userId: String(userId),
        emoji,
        createdAt: now,
        updatedAt: now,
      });
      
      return successResponse({ added: true }, 200, ctx.correlationId);
    } catch (error) {
      console.error("reactions POST error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to toggle reaction", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: reactionToggleSchema,
    rateLimit: { identifier: "reactions_post", maxRequests: 60 }
  }
);
