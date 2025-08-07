import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { requireAuth } from "@/lib/auth/requireAuth";
import { convexQueryWithAuth } from "@/lib/convexServer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { userId } = await requireAuth(request);

    // Await params
    const { messageId } = await params;

    // Rate limiting for voice message URL access
    const rateLimitResult = checkApiRateLimit(`voice_url_${userId}`, 100, 60000); // 100 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }



    // Validate messageId
    if (!messageId || typeof messageId !== 'string' || messageId.trim().length === 0) {
      return errorResponse("Invalid or missing messageId", 400);
    }

    if (!userId) {
      return errorResponse("User ID not found in token", 401);
    }

    const voiceMessage = await convexQueryWithAuth(request, api.messages.getVoiceMessage, {
      messageId: messageId as Id<"messages">,
    } as any);

    if (!voiceMessage) {
      return errorResponse("Voice message not found", 404);
    }

    // Verify user has permission to access this voice message
    // User must be either the sender or receiver
    if (voiceMessage.fromUserId !== userId && voiceMessage.toUserId !== userId) {
      return errorResponse("Unauthorized access to voice message", 403);
    }

    const audioUrl = await convexQueryWithAuth(request, api.messages.getVoiceMessageUrl, {
      storageId: voiceMessage.audioStorageId!,
    } as any);

    if (!audioUrl) {
      return errorResponse("Failed to generate audio URL", 500);
    }

    return successResponse({
      audioUrl,
      duration: voiceMessage.duration,
      fileSize: voiceMessage.fileSize,
      mimeType: voiceMessage.mimeType,
    });



  } catch (error) {
    console.error("Error getting voice message URL:", error);
    
    const isAuthError = error instanceof Error && 
      (error.message.includes("Unauthenticated") || 
       error.message.includes("Unauthorized") ||
       error.message.includes("token"));
       
    return errorResponse(
      isAuthError ? "Authentication failed" : "Failed to get voice message URL",
      isAuthError ? 401 : 500
    );
  }
}