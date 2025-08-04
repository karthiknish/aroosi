import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { requireUserToken } from "@/app/api/_utils/auth";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { successResponse, errorResponse } from "@/lib/apiResponse";

// Accepts multipart/form-data with fields:
// - image: File (required)
// - conversationId: string (required, "userA_userB")
// - fromUserId: string (required)
// - toUserId: string (required)
// - fileName: string (optional - fallback to image.name)
// - contentType: string (optional - fallback to image.type)
// Emits SSE "message_sent" after successful Convex insert.
export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    // Auth via cookie or bearer token
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) {
      const res = authCheck.errorResponse as Response;
      const status = (res as any)?.status || 401;
      let message = "Unauthorized";
      try {
        const txt = await (res as any).text?.();
        const parsed = txt ? JSON.parse(txt) : undefined;
        message = (parsed?.error as string) || message;
      } catch {}
      return errorResponse(message, status, { correlationId });
    }
    const { token, userId } = authCheck;

    // Subscription-aware rate limit for image message upload
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      token,
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
      return errorResponse("Invalid multipart form data", 400, { correlationId });
    }

    const image = formData.get("image") as File | null;
    const conversationId = (formData.get("conversationId") as string | null) || "";
    const fromUserId = (formData.get("fromUserId") as string | null) || "";
    const toUserId = (formData.get("toUserId") as string | null) || "";
    const fileName = (formData.get("fileName") as string | null) || image?.name || "image";
    const contentType = (formData.get("contentType") as string | null) || image?.type || "application/octet-stream";

    if (!image) {
      return errorResponse("Missing image file", 400, { correlationId });
    }
    if (!conversationId || !fromUserId || !toUserId) {
      return errorResponse("Missing required fields", 400, {
        correlationId,
        fields: { conversationId: !!conversationId, fromUserId: !!fromUserId, toUserId: !!toUserId },
      });
    }

    // Participant check (cookie user must be in conversation)
    if (!userId) {
      return errorResponse("User ID not found", 401, { correlationId });
    }
    const userIds = conversationId.split("_");
    if (!userIds.includes(userId)) {
      return errorResponse("Unauthorized access to conversation", 403, { correlationId });
    }

    // Prepare Convex client
    const client = getConvexClient();
    if (!client) {
      return errorResponse("Database connection failed", 500, { correlationId });
    }
    try {
      // @ts-ignore optional in some versions
      client.setAuth?.(token);
    } catch {}

    // For image message, we need to upload to Convex storage first
    // Reuse the voice upload approach: stream to storage and store storageId in message
    // Read file as ArrayBuffer for upload
    const arrayBuffer = await image.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Upload to storage via Convex (assuming you have a helper or use action)
    // If you have an action to upload binary, call it; otherwise, use generic storage API
    // Here we assume a Convex action exists to accept raw bytes and return storageId
    // If not, adapt to your existing storage pipeline
    let storageId: string;
    try {
      const { uploadImageToStorage } = await import("@/lib/storage/convexStorage");
      storageId = await uploadImageToStorage(bytes, fileName, contentType, token);
    } catch {
      // Fallback: if no helper present, call a generic convex mutation if provided
      // Or return explicit error to avoid hiding missing infra
      return errorResponse("Image storage upload is not configured", 500, { correlationId });
    }

    // Create the message in Convex (type=image)
    const message = await client
      .mutation(api.messages.sendMessage, {
        conversationId,
        fromUserId: fromUserId as Id<"users">,
        toUserId: toUserId as Id<"users">,
        type: "image",
        audioStorageId: storageId, // reusing field name used for voice; schema supports generic storageId here
        fileSize: image.size,
        mimeType: contentType,
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Send failed";
        throw new Error(String(msg));
      });

    // Broadcast SSE event for UI refresh
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, {
        type: "message_sent",
        message,
      });
    } catch (eventError) {
      console.warn("Messages upload-image POST broadcast warn", {
        scope: "messages.upload-image",
        type: "broadcast_warn",
        message: eventError instanceof Error ? eventError.message : String(eventError),
        correlationId,
      });
    }

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
    return errorResponse(message || "Failed to upload image message", 500, { correlationId });
  }
}