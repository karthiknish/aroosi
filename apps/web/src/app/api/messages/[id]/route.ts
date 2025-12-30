import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { messagePatchSchema } from "@/lib/validation/apiSchemas/messages";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/messages/:id (edit text)
export const PATCH = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof messagePatchSchema>, routeCtx?: RouteContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const params = routeCtx ? await routeCtx.params : null;
    const messageId = params?.id || new URL(ctx.request.url).pathname.split("/").pop();

    if (!messageId) {
      return errorResponse("Missing message id", 400, { correlationId: ctx.correlationId });
    }

    try {
      const msgRef = db.collection("messages").doc(messageId);
      const msgSnap = await msgRef.get();
      if (!msgSnap.exists) {
        return errorResponse("Message not found", 404, { correlationId: ctx.correlationId });
      }
      const message = msgSnap.data() as any;

      // Authorization: only sender can edit their text messages
      if (message.fromUserId !== userId) {
        return errorResponse("Forbidden", 403, { correlationId: ctx.correlationId });
      }
      if (message.type && message.type !== "text") {
        return errorResponse("Only text messages can be edited", 400, { correlationId: ctx.correlationId });
      }
      if (message.deleted) {
        return errorResponse("Cannot edit a deleted message", 400, { correlationId: ctx.correlationId });
      }

      const now = nowTimestamp();
      await msgRef.set({ text: body.text, edited: true, editedAt: now }, { merge: true });

      // Update denormalized lastMessage if needed
      const conversationId = String(message.conversationId || "");
      if (conversationId) {
        try {
          const convRef = db.collection("conversations").doc(conversationId);
          const convSnap = await convRef.get();
          if (convSnap.exists) {
            const conv = convSnap.data() as any;
            const lastId = conv?.lastMessage?.id || conv?.lastMessage?._id;
            if (lastId === messageId) {
              await convRef.set(
                { lastMessage: { ...(conv.lastMessage || {}), id: messageId, text: body.text }, updatedAt: now },
                { merge: true }
              );
            }
          }
        } catch {}
      }

      return successResponse({ success: true }, 200, ctx.correlationId);
    } catch (error) {
      console.error("messages/[id] PATCH error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to edit message", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: messagePatchSchema,
    rateLimit: { identifier: "messages_edit", maxRequests: 30 }
  }
);

// DELETE /api/messages/:id
export const DELETE = createAuthenticatedHandler(
  async (ctx: ApiContext, _body: unknown, routeCtx?: RouteContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const params = routeCtx ? await routeCtx.params : null;
    const messageId = params?.id || new URL(ctx.request.url).pathname.split("/").pop();

    if (!messageId) {
      return errorResponse("Missing message id", 400, { correlationId: ctx.correlationId });
    }

    try {
      const msgRef = db.collection("messages").doc(messageId);
      const msgSnap = await msgRef.get();
      if (!msgSnap.exists) {
        return errorResponse("Message not found", 404, { correlationId: ctx.correlationId });
      }
      const message = msgSnap.data() as any;

      // Authorization: only sender or recipient can delete
      if (message.fromUserId !== userId && message.toUserId !== userId) {
        return errorResponse("Forbidden", 403, { correlationId: ctx.correlationId });
      }

      // Soft delete
      const now = nowTimestamp();
      await msgRef.set(
        { deleted: true, deletedAt: now, deletedBy: userId, text: "" },
        { merge: true }
      );

      // Recompute lastMessage on conversation if needed
      const conversationId = String(message.conversationId || "");
      if (conversationId) {
        try {
          const convRef = db.collection("conversations").doc(conversationId);
          const convSnap = await convRef.get();
          if (convSnap.exists) {
            const conv = convSnap.data() as any;
            const lastId = conv?.lastMessage?.id || conv?.lastMessage?._id;
            if (lastId === messageId) {
              const latestSnap = await db
                .collection("messages")
                .where("conversationId", "==", conversationId)
                .where("deleted", "!=", true)
                .orderBy("deleted", "asc")
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();
              if (!latestSnap.empty) {
                const d = latestSnap.docs[0];
                const m = d.data() as any;
                await convRef.set(
                  {
                    lastMessage: {
                      id: d.id,
                      fromUserId: m.fromUserId,
                      toUserId: m.toUserId,
                      text: m.text || "",
                      type: m.type || "text",
                      createdAt: m.createdAt,
                    },
                    updatedAt: m.createdAt || now,
                  },
                  { merge: true }
                );
              } else {
                await convRef.set({ lastMessage: null, updatedAt: now }, { merge: true });
              }
            }
          }
        } catch {}
      }

      return successResponse({ success: true }, 200, ctx.correlationId);
    } catch (error) {
      console.error("messages/[id] DELETE error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to delete message", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "messages_delete", maxRequests: 30 }
  }
);
