import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { validateConversationId } from "@/lib/utils/messageValidation";
import { formatVoiceDuration } from "@/lib/utils/messageUtils";

// Initialize Convex client
const convexClient = getConvexClient();

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting for voice message uploads
    const rateLimitResult = checkApiRateLimit(
      `voice_upload_${userId}`,
      10,
      60000,
    ); // 10 uploads per minute
    if (!rateLimitResult.allowed) {
      return errorResponse(
        "Rate limit exceeded. Please wait before uploading more voice messages.",
        429,
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

    // Database operations
    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }

    if (!client) {
      return errorResponse("Database connection failed", 500);
    }

    client.setAuth(token);

    // Verify user is part of this conversation
    if (!userId) {
      return errorResponse("User ID not found", 401);
    }
    const userIds = conversationId.split("_");
    if (!userIds.includes(userId)) {
      return errorResponse("Unauthorized access to conversation", 403);
    }

    // Check if either user has blocked the other
    const blockStatus = await client.query(api.safety.getBlockStatus, {
      blockerUserId: userId as Id<"users">,
      blockedUserId: toUserId as Id<"users">,
    });

    if (blockStatus) {
      return errorResponse("Cannot send voice message to this user", 403);
    }

    // Check subscription limits for voice messages
    const canSendVoice = await client.query(
      api.subscriptions.checkFeatureAccess,
      {
        userId: userId as Id<"users">,
        feature: "voice_messages",
      },
    );

    if (!canSendVoice) {
      return errorResponse(
        "Voice messages require a premium subscription",
        403,
      );
    }

    // Generate upload URL for the audio file
    const uploadUrl = await client.mutation(api.messages.generateUploadUrl, {});

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
    const message = await client.mutation(api.messages.sendMessage, {
      conversationId,
      fromUserId: userId as Id<"users">,
      toUserId: toUserId as Id<"users">,
      text: `Voice message (${formatVoiceDuration(duration)})`,
      type: "voice",
      audioStorageId: storageId,
      duration,
      fileSize: audioFile.size,
      mimeType: audioFile.type,
    });

    if (!message) {
      return errorResponse("Failed to create voice message record", 500);
    }

    return successResponse({
      message: "Voice message uploaded successfully",
      messageId: message._id,
      duration,
      storageId,
    });
  } catch (error) {
    console.error("Error uploading voice message:", error);
    return errorResponse("Failed to upload voice message", 500);
  }
}
