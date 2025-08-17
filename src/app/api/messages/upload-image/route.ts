import { NextRequest } from "next/server";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import {
  uploadMessageImage,
  sendFirebaseMessage,
} from "@/lib/messages/firebaseMessages";

// Accepts multipart/form-data with fields:
// - image: File (required)
// - conversationId: string (required, "userA_userB")
// - fromUserId: string (required)
// - toUserId: string (required)
// - fileName: string (optional - fallback to image.name)
// - contentType: string (optional - fallback to image.type)
// Emits SSE "message_sent" after successful Convex insert.
export const POST = withFirebaseAuth(async (authUser, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const userId = authUser.id;

    // Subscription-aware rate limit for image message upload
    // Cookie-only: pass empty string for token parameter to satisfy current signature
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "",
      userId || "unknown",
      "message_sent",
      60_000
    );
    if (!rate.allowed) {
      return errorResponse(rate.error || "Rate limit exceeded", 429, {
        correlationId,
        plan: rate.plan,
        limit: rate.limit,
        remaining: rate.remaining,
        resetTime: new Date(rate.resetTime).toISOString(),
      });
    }

    // Parse multipart form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse("Invalid multipart form data", 400, {
        correlationId,
      });
    }

    const image = formData.get("image") as File | null;
    const conversationId =
      (formData.get("conversationId") as string | null) || "";
    const fromUserId = (formData.get("fromUserId") as string | null) || "";
    const toUserId = (formData.get("toUserId") as string | null) || "";
    const fileName =
      (formData.get("fileName") as string | null) || image?.name || "image";
    const contentType =
      (formData.get("contentType") as string | null) ||
      image?.type ||
      "application/octet-stream";

    if (!image) {
      return errorResponse("Missing image file", 400, { correlationId });
    }
    if (!conversationId || !fromUserId || !toUserId) {
      return errorResponse("Missing required fields", 400, {
        correlationId,
        fields: {
          conversationId: !!conversationId,
          fromUserId: !!fromUserId,
          toUserId: !!toUserId,
        },
      });
    }

    // Participant check (cookie user must be in conversation)
    if (!userId) {
      return errorResponse("User ID not found", 401, { correlationId });
    }
    const userIds = conversationId.split("_");
    if (!userIds.includes(userId)) {
      return errorResponse("Unauthorized access to conversation", 403, {
        correlationId,
      });
    }

    // Build bytes for upload
    const arrayBuffer = await image.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Upload image to Firebase Storage
    const { storageId } = await uploadMessageImage({
      conversationId,
      fileName,
      contentType,
      bytes,
    });

    // Create message document
    const message = await sendFirebaseMessage({
      conversationId,
      fromUserId,
      toUserId,
      type: "image",
      audioStorageId: storageId,
      fileSize: image.size,
      mimeType: contentType,
    });

    return successResponse(
      {
        message: "Image message uploaded successfully",
        messageId: (message as any)?._id,
        storageId,
        correlationId,
        durationMs: Date.now() - startedAt,
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message || "Failed to upload image message", 500, {
      correlationId,
    });
  }
});
