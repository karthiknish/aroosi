import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { requireSession } from "@/app/api/_utils/auth";
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
    // Cookie-only auth
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      const res = session.errorResponse as Response;
      const status = (res as any)?.status || 401;
      let message = "Unauthorized";
      try {
        const txt = await (res as any).text?.();
        const parsed = txt ? JSON.parse(txt) : undefined;
        message = (parsed?.error as string) || message;
      } catch {}
      return errorResponse(message, status, { correlationId });
    }
    const { userId } = session;

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

    // Prepare Convex client
    const client = getConvexClient();
    if (!client) {
      return errorResponse("Database connection failed", 500, {
        correlationId,
      });
    }
    // Cookie-only: do not call client.setAuth with a bearer token

    // Build bytes for upload
    const arrayBuffer = await image.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Upload image to storage via helper (server identity; no bearer token)
    let storageId: string;
    try {
      const { uploadImageToStorage } = await import(
        "@/lib/storage/convexStorage"
      );
      // If helper still accepts a token param, pass empty string to satisfy types
      storageId = await uploadImageToStorage(
        bytes,
        fileName,
        contentType,
        "" as any
      );
    } catch {
      return errorResponse("Image storage upload is not configured", 500, {
        correlationId,
      });
    }

    // Create the message in Convex (type=image)
    const message = await client
      .mutation(api.messages.sendMessage, {
        conversationId,
        fromUserId: fromUserId as Id<"users">,
        toUserId: toUserId as Id<"users">,
        type: "image",
        audioStorageId: storageId, // schema may alias
        fileSize: image.size,
        mimeType: contentType,
      })
      .catch((e: unknown) => {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "Send failed";
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
        message:
          eventError instanceof Error ? eventError.message : String(eventError),
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
    return errorResponse(message || "Failed to upload image message", 500, {
      correlationId,
    });
  }
}