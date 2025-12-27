import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { sendFirebaseMessage } from "@/lib/messages/firebaseMessages";
import {
  validateConversationId,
  validateTextMessage,
  validateImageMessage,
} from "@/lib/validation/message";
import { moderateProfanity } from "@/lib/moderation/profanity";
import { getPlanLimits } from "@/lib/subscription/planLimits";
import { db } from "@/lib/firebaseAdmin";

// Zod schema for request body
const sendMessageSchema = z.object({
  conversationId: z.string().min(1, "conversationId is required"),
  fromUserId: z.string().min(1, "fromUserId is required"),
  toUserId: z.string().min(1, "toUserId is required"),
  text: z.string().optional(),
  type: z.enum(["text", "voice", "image", "icebreaker"]).optional(),
  audioStorageId: z.string().optional(),
  duration: z.number().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});


export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof sendMessageSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const startedAt = Date.now();
    
    try {
      // Subscription-based rate limiting
      const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
        ctx.request,
        "" as unknown as string,
        userId || "unknown",
        "message_send",
        60_000
      );
      if (!rate.allowed) {
        return errorResponse(rate.error || "Rate limit exceeded", 429, {
          correlationId: ctx.correlationId,
        });
      }

      const { conversationId, fromUserId, toUserId, text, type, audioStorageId, duration, fileSize, mimeType } = body;

      // Validate conversation
      const convValidation = validateConversationId(conversationId);
      if (!convValidation.ok) {
        return errorResponse(
          convValidation.message || "Invalid conversation",
          400,
          { correlationId: ctx.correlationId }
        );
      }
      if (!convValidation.participants?.includes(userId)) {
        return errorResponse("Unauthorized access to conversation", 403, {
          correlationId: ctx.correlationId,
        });
      }

      // Block checks (bidirectional)
      const forwardBlock = await db.collection("blocks").doc(`${fromUserId}_${toUserId}`).get();
      const reverseBlock = await db.collection("blocks").doc(`${toUserId}_${fromUserId}`).get();
      if (forwardBlock.exists || reverseBlock.exists) {
        return errorResponse("Cannot send message (user is blocked)", 403, {
          correlationId: ctx.correlationId,
        });
      }

      const resolvedType = type || "text";
      let finalText: string | undefined = text;

      // Type-specific validation
      if (resolvedType === "text") {
        const textValidation = validateTextMessage({ text: text || "" });
        if (!textValidation.ok) {
          return errorResponse(textValidation.message || "Invalid text", 400, {
            correlationId: ctx.correlationId,
          });
        }
        const moderation = moderateProfanity(textValidation.normalized || "");
        finalText = moderation.clean ? textValidation.normalized : moderation.sanitized;
      } else if (resolvedType === "voice") {
        if (!audioStorageId) {
          return errorResponse("Voice message missing audioStorageId", 400, {
            correlationId: ctx.correlationId,
          });
        }
        if (typeof duration !== "number" || duration <= 0) {
          return errorResponse("Voice message missing duration", 400, {
            correlationId: ctx.correlationId,
          });
        }
      } else if (resolvedType === "image") {
        const imgValidation = validateImageMessage({
          hasStorageId: !!audioStorageId,
          mimeType: mimeType,
        });
        if (!imgValidation.ok) {
          return errorResponse(imgValidation.message || "Invalid image message", 400, {
            correlationId: ctx.correlationId,
          });
        }
      }

      // Monthly quota enforcement
      try {
        const feature = resolvedType === "voice" ? "voice_message_sent" : "message_sent";
        const monthKey = new Date().toISOString().slice(0, 7);
        const usageDocId = `${userId}_${feature}_${monthKey}`;
        const usageRef = db.collection("usageEvents").doc(usageDocId);
        const usageSnap = await usageRef.get();
        const currentCount = usageSnap.exists ? (usageSnap.data() as any).count || 0 : 0;
        const limits = getPlanLimits(rate.plan || "free");
        const limit = limits[feature] ?? -1;
        if (limit !== -1 && currentCount >= limit) {
          return errorResponse(`Monthly quota exceeded for ${feature}`, 429, {
            correlationId: ctx.correlationId,
            feature,
            limit,
          });
        }
        await usageRef.set(
          { feature, month: monthKey, userId, count: currentCount + 1, updatedAt: Date.now() },
          { merge: true }
        );
      } catch (quotaErr) {
        console.warn("quotaCheckFailed", quotaErr);
      }

      const message = await sendFirebaseMessage({
        conversationId,
        fromUserId,
        toUserId,
        type: resolvedType,
        text: resolvedType === "text" ? finalText : undefined,
        audioStorageId,
        duration,
        fileSize,
        mimeType,
      });

      return successResponse(message, 200, ctx.correlationId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("messages/send error", {
        error: msg,
        correlationId: ctx.correlationId,
        durationMs: Date.now() - startedAt,
      });
      return errorResponse("Failed to send message", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    bodySchema: sendMessageSchema,
    // Rate limiting is handled by subscriptionRateLimiter internally
  }
);
