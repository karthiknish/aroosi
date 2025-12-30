import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import type { SupervisedConversation } from "@aroosi/shared/types";
import { supervisedConversationInitiateSchema } from "@/lib/validation/apiSchemas/supervisedConversation";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof supervisedConversationInitiateSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { targetUserId, supervisorId, guidelines } = body;

    try {
      // Check if supervisor has approved family approval for this user
      const approvalSnapshot = await db
        .collection("familyApprovalRequests")
        .where("requesterId", "==", userId)
        .where("familyMemberId", "==", supervisorId)
        .where("status", "==", "approved")
        .limit(1)
        .get();

      if (approvalSnapshot.empty) {
        return errorResponse("Supervisor must approve family approval first", 403, { correlationId: ctx.correlationId });
      }

      // Check if there's already an active supervised conversation
      const existingConversation = await db
        .collection("supervisedConversations")
        .where("requesterId", "==", userId)
        .where("targetUserId", "==", targetUserId)
        .where("supervisorId", "==", supervisorId)
        .where("status", "in", ["initiated", "approved", "active"])
        .limit(1)
        .get();

      if (!existingConversation.empty) {
        return errorResponse("A supervised conversation already exists for this pair", 409, { correlationId: ctx.correlationId });
      }

      const now = Date.now();
      const conversationData: Omit<SupervisedConversation, "_id"> = {
        requesterId: userId,
        targetUserId,
        supervisorId,
        status: "initiated",
        guidelines: guidelines || [],
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await db.collection("supervisedConversations").add(conversationData);
      const newConversation = { _id: docRef.id, ...conversationData };

      return successResponse({ conversation: newConversation }, 201, ctx.correlationId);
    } catch (error) {
      console.error("cultural/supervised-conversation/initiate error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to initiate conversation", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: supervisedConversationInitiateSchema,
    rateLimit: { identifier: "supervised_conv_init", maxRequests: 30 }
  }
);
