import { NextRequest } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { sendFirebaseMessage } from "@/lib/messages/firebaseMessages";
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
    const participants = conversationId.split("_");
    if (!participants.includes(userId)) {
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
      if (!text || text.trim() === "") {
        return errorResponse("Text message cannot be empty", 400, {
          correlationId,
        });
      }
      finalText = text.trim();
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
      if (!audioStorageId) {
        return errorResponse("Image message missing storageId", 400, {
          correlationId,
        });
      }
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
