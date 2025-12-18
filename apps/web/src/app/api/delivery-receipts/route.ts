import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

// Zod schema for POST body
const createReceiptSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  status: z.enum(["delivered", "read", "failed"]),
});

// GET /api/delivery-receipts?conversationId=...
export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    try {
      const { searchParams } = new URL(ctx.request.url);
      const conversationId = searchParams.get("conversationId");
      
      if (!conversationId) {
        return errorResponse("conversationId is required", 400, { correlationId: ctx.correlationId });
      }

      // Fetch receipts for the conversation
      const snap = await db
        .collection("messageReceipts")
        .where("conversationId", "==", conversationId)
        .get();

      const deliveryReceipts = snap.docs.map((d: any) => {
        const data = d.data() || {};
        return {
          id: d.id,
          messageId: data.messageId,
          userId: data.userId,
          status: data.status,
          updatedAt: data.updatedAt || data.timestamp || Date.now(),
        };
      });

      return successResponse({ deliveryReceipts }, 200, ctx.correlationId);
    } catch (error) {
      console.error("delivery-receipts GET error", {
        error: error instanceof Error ? error.message : String(error),
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to load receipts", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "delivery_receipts_get", maxRequests: 60 }
  }
);

// POST /api/delivery-receipts { messageId, status }
export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof createReceiptSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const { messageId, status } = body;

      // Lookup message to denormalize conversationId
      const msgDoc = await db.collection("messages").doc(messageId).get();
      const messageData = msgDoc.exists ? (msgDoc.data() as any) : null;
      const conversationId = messageData?.conversationId || null;

      const receiptId = `${messageId}_${userId}`;
      const updatedAt = Date.now();
      
      await db
        .collection("messageReceipts")
        .doc(receiptId)
        .set(
          {
            messageId,
            userId,
            status,
            updatedAt,
            ...(conversationId ? { conversationId } : {}),
          },
          { merge: true }
        );

      return successResponse({ messageId, status, updatedAt }, 200, ctx.correlationId);
    } catch (error) {
      console.error("delivery-receipts POST error", {
        error: error instanceof Error ? error.message : String(error),
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to record receipt", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: createReceiptSchema,
    rateLimit: { identifier: "delivery_receipts_post", maxRequests: 100 }
  }
);
