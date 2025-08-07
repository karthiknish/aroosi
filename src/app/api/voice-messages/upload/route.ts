import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { validateConversationId } from "@/lib/utils/messageValidation";
import { formatVoiceDuration } from "@/lib/utils/messageUtils";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchMutation, fetchQuery } from "convex/nextjs";

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { userId } = await requireAuth(request);

    // Subscription-aware rate limiting for voice uploads
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "" as unknown as string, // cookie-only: no token provided
      userId || "unknown",
      "voice_upload",
      60000
    );
    if (!rate.allowed) {
      return errorResponse(
        rate.error || "Rate limit exceeded. Please wait before uploading more voice messages.",
        429
      );
    }

    // Parse form data
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse("Invalid form data", 400);
    }

    const audioFile = formData.get("audio") as File;
    const conversationId = formData.get("conversationId") as string;
    const duration = parseFloat(formData.get("duration") as string);
    const toUserId = formData.get("toUserId") as string;

    // Optional waveform peaks (JSON array of normalized numbers 0..1)
    const peaksRaw = formData.get("peaks") as string | null;
    let peaks: number[] | undefined = undefined;
    if (typeof peaksRaw === "string" && peaksRaw.length) {
      try {
        const parsed = JSON.parse(peaksRaw);
        if (Array.isArray(parsed) && parsed.every((n: any) => typeof n === "number" && n >= 0 && n <= 1)) {
          // Bound payload size defensively
          peaks = parsed.slice(0, 256);
        }
      } catch {
        // ignore malformed peaks; proceed without it
      }
    }

    // Validate required fields
    if (!audioFile || !conversationId || !duration || !toUserId) {
      return errorResponse(
        "Missing required fields: audio, conversationId, duration, toUserId",
        400,
      );
    }

    // Validate conversation ID format
    if (!validateConversationId(conversationId)) {
      return errorResponse("Invalid conversationId format", 400);
    }

    // Validate file type
    if (!audioFile.type.startsWith("audio/")) {
      return errorResponse("Invalid file type. Must be audio.", 400);
    }

    // Validate file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (audioFile.size > maxSize) {
      return errorResponse("File too large. Maximum size is 10MB.", 400);
    }

    // Validate duration (limit to 5 minutes)
    if (duration <= 0 || duration > 300) {
      return errorResponse(
        "Invalid duration. Must be between 1 second and 5 minutes.",
        400,
      );
    }

    // Database operations via Convex server

    // Verify user is part of this conversation
    if (!userId) {
      return errorResponse("User ID not found", 401);
    }
    const userIds = conversationId.split("_");
    if (!userIds.includes(userId)) {
      return errorResponse("Unauthorized access to conversation", 403);
    }

    // Check if either user has blocked the other
    const blockStatus = await fetchQuery(api.safety.getBlockStatus, {
      blockerUserId: userId as Id<"users">,
      blockedUserId: toUserId as Id<"users">,
    } as any);

    if (blockStatus) {
      return errorResponse("Cannot send voice message to this user", 403);
    }

    // Check subscription limits for voice messages
    const canSendVoice = await fetchQuery(
      api.subscriptions.checkFeatureAccess,
      {
        userId: userId as Id<"users">,
        feature: "voice_messages",
      } as any,
    );

    if (!canSendVoice) {
      return errorResponse(
        "Voice messages require a premium subscription",
        403,
      );
    }

    // Generate upload URL for the audio file
    const uploadUrl = await fetchMutation(api.messages.generateUploadUrl, {} as any);

    // Upload the audio file to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: audioFile,
    });

    if (!uploadResponse.ok) {
      return errorResponse("Failed to upload audio file", 500);
    }

    const { storageId } = await uploadResponse.json();

    // Create the voice message record
    const message = await fetchMutation(api.messages.sendMessage, {
      conversationId,
      fromUserId: userId as Id<"users">,
      toUserId: toUserId as Id<"users">,
      text: `Voice message (${formatVoiceDuration(duration)})`,
      type: "voice",
      audioStorageId: storageId,
      duration,
      fileSize: audioFile.size,
      mimeType: audioFile.type,
      peaks,
    } as any);

    if (!message) {
      return errorResponse("Failed to create voice message record", 500);
    }

    // Emit SSE message_sent for voice message
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, {
        type: "message_sent",
        message,
      });
    } catch (eventError) {
      console.warn("Voice message SSE emit failed", {
        scope: "voice.upload",
        correlationId,
        message: eventError instanceof Error ? eventError.message : String(eventError),
      });
    }

    return successResponse({
      message: "Voice message uploaded successfully",
      messageId: message._id,
      duration,
      storageId,
      correlationId,
      durationMs: Date.now() - startedAt,
    }, 200);
  } catch (error) {
    console.error("Error uploading voice message:", error);
    return errorResponse("Failed to upload voice message", 500);
  }
}
