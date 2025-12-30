import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import type {
  SupervisedConversation,
  SupervisedConversationStatus,
} from "@aroosi/shared/types";
import { NextRequest } from "next/server";
import { supervisedConversationUpdateSchema } from "@/lib/validation/apiSchemas/supervisedConversation";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const handler = createAuthenticatedHandler(
    async (ctx: ApiContext, body: import("zod").infer<typeof supervisedConversationUpdateSchema>) => {
      const { id: conversationId } = await context.params;
      const userId = (ctx.user as any).userId || (ctx.user as any).id;
      const { status, conversationId: chatConversationId } = body;

      try {
        const conversationDoc = await db.collection("supervisedConversations").doc(conversationId).get();
        if (!conversationDoc.exists) {
          return errorResponse("Conversation not found", 404, { correlationId: ctx.correlationId });
        }

        const conversation = { _id: conversationDoc.id, ...conversationDoc.data() } as SupervisedConversation;

        // Check if user is involved in this conversation
        if (conversation.requesterId !== userId && conversation.supervisorId !== userId && conversation.targetUserId !== userId) {
          return errorResponse("You are not authorized to update this conversation", 403, { correlationId: ctx.correlationId });
        }

        // Status-specific validations
        if (status) {
          if (status === "approved" && conversation.supervisorId !== userId) {
            return errorResponse("Only the supervisor can approve conversations", 403, { correlationId: ctx.correlationId });
          }
          if (status === "active" && conversation.status !== "approved") {
            return errorResponse("Conversation must be approved before becoming active", 400, { correlationId: ctx.correlationId });
          }
        }

        const now = Date.now();
        const updateData: Partial<SupervisedConversation> = { updatedAt: now };

        if (status) {
          updateData.status = status as SupervisedConversationStatus;
          if (status === "active" && !conversation.startedAt) updateData.startedAt = now;
          if (["ended", "rejected"].includes(status) && !conversation.endedAt) updateData.endedAt = now;
        }

        if (chatConversationId) updateData.conversationId = chatConversationId;

        await db.collection("supervisedConversations").doc(conversationId).update(updateData);
        const updatedDoc = await db.collection("supervisedConversations").doc(conversationId).get();
        const updatedConversation = { _id: updatedDoc.id, ...updatedDoc.data() } as SupervisedConversation;

        return successResponse({ conversation: updatedConversation }, 200, ctx.correlationId);
      } catch (error) {
        console.error("cultural/supervised-conversation/[id] PUT error", { error, correlationId: ctx.correlationId });
        return errorResponse("Failed to update conversation", 500, { correlationId: ctx.correlationId });
      }
    },
    {
      bodySchema: supervisedConversationUpdateSchema,
      rateLimit: { identifier: "supervised_conv_update", maxRequests: 50 }
    }
  );
  return handler(request);
}
