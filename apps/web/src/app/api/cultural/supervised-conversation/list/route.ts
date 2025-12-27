import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import type { SupervisedConversation } from "@aroosi/shared/types";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;

    try {
      const conversationsSnapshot = await db
        .collection("supervisedConversations")
        .where("requesterId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

      const conversations: SupervisedConversation[] = [];
      conversationsSnapshot.forEach((doc: any) => {
        conversations.push({ _id: doc.id, ...doc.data() } as SupervisedConversation);
      });

      return successResponse({ conversations }, 200, ctx.correlationId);
    } catch (error) {
      console.error("cultural/supervised-conversation/list error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch conversations", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "supervised_conv_list", maxRequests: 100 }
  }
);
