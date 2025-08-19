import { NextRequest } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { sendFirebaseMessage } from "@/lib/messages/firebaseMessages";
import {
  validateConversationId,
  validateTextMessage,
  validateImageMessage,
} from "@/lib/validation/message";
import { moderateProfanity } from "@/lib/moderation/profanity";
import { getPlanLimits, featureRemaining } from "@/lib/subscription/planLimits";
import { db } from "@/lib/firebaseAdmin";

// ApiResponse envelope type
export const POST = withFirebaseAuth(async (authUser, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const userId = authUser.id;

    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "" as unknown as string,
      userId || "unknown",
      "message_send",
      60_000
    );
    if (!rate.allowed) {
      return errorResponse(rate.error || "Rate limit exceeded", 429, {
        correlationId,
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400, { correlationId });
    }

    const {
      conversationId,
      fromUserId,
      toUserId,
      text,
      type,
      audioStorageId,
      duration,
      fileSize,
      mimeType,
    } = (body || {}) as {
      conversationId?: string;
      fromUserId?: string;
      toUserId?: string;
      text?: string;
      type?: "text" | "voice" | "image";
      audioStorageId?: string;
      duration?: number;
      fileSize?: number;
      mimeType?: string;
    };

    if (!conversationId || !fromUserId || !toUserId) {
      return errorResponse("Missing required fields", 400, { correlationId });
    }
    const convValidation = validateConversationId(conversationId);
    if (!convValidation.ok) {
      return errorResponse(
        convValidation.message || "Invalid conversation",
        400,
        { correlationId }
      );
    }
    if (!convValidation.participants?.includes(userId)) {
      return errorResponse("Unauthorized access to conversation", 403, {
        correlationId,
      });
    }

    // Block checks (bidirectional). Prevent sending if either direction block exists.
    const forwardBlock = await db
      .collection("blocks")
      .doc(`${fromUserId}_${toUserId}`)
      .get();
    const reverseBlock = await db
      .collection("blocks")
      .doc(`${toUserId}_${fromUserId}`)
      .get();
    if (forwardBlock.exists || reverseBlock.exists) {
      return errorResponse("Cannot send message (user is blocked)", 403, {
        correlationId,
      });
    }

    const resolvedType: "text" | "voice" | "image" = type || "text";
    let finalText: string | undefined = text;

    if (resolvedType === "text") {
      const textValidation = validateTextMessage({ text: text || "" });
      if (!textValidation.ok) {
        return errorResponse(textValidation.message || "Invalid text", 400, {
          correlationId,
        });
      }
      const moderation = moderateProfanity(textValidation.normalized || "");
      finalText = moderation.clean
        ? textValidation.normalized
        : moderation.sanitized;
    } else if (resolvedType === "voice") {
      if (!audioStorageId) {
        return errorResponse("Voice message missing audioStorageId", 400, {
          correlationId,
        });
      }
      if (typeof duration !== "number" || duration <= 0) {
        return errorResponse("Voice message missing duration", 400, {
          correlationId,
        });
      }
    } else if (resolvedType === "image") {
      const imgValidation = validateImageMessage({
        hasStorageId: !!audioStorageId,
        mimeType: mimeType,
      });
      if (!imgValidation.ok) {
        return errorResponse(
          imgValidation.message || "Invalid image message",
          400,
          { correlationId }
        );
      }
    }
    // Monthly quota enforcement AFTER validation, before send
    try {
      const feature =
        resolvedType === "voice" ? "voice_message_sent" : "message_sent";
      const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
      const usageDocId = `${userId}_${feature}_${monthKey}`;
      const usageRef = db.collection("usageEvents").doc(usageDocId);
      const usageSnap = await usageRef.get();
      const currentCount = usageSnap.exists
        ? (usageSnap.data() as any).count || 0
        : 0;
      const limits = getPlanLimits(rate.plan || "free");
      const limit = limits[feature] ?? -1;
      if (limit !== -1 && currentCount >= limit) {
        return errorResponse(`Monthly quota exceeded for ${feature}`, 429, {
          correlationId,
          feature,
          limit,
        });
      }
      await usageRef.set(
        {
          feature,
          month: monthKey,
          userId,
          count: currentCount + 1,
          updatedAt: Date.now(),
        },
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
    return successResponse(message, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return errorResponse(msg || "Failed to send message", 500, {
      correlationId,
    });
  } finally {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("messages.send", {
        correlationId,
        durationMs: Date.now() - startedAt,
      });
    }
  }
});
