import { NextRequest } from "next/server";
import { db, adminStorage } from "@/lib/firebaseAdmin";
import { COL_VOICE_MESSAGES } from "@/lib/firestoreSchema";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { requireSession, devLog } from "@/app/api/_utils/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    // Await params
    const { messageId } = await params;

    // Rate limiting for voice message URL access
    const rateLimitResult = checkApiRateLimit(
      `voice_url_${userId}`,
      100,
      60000
    ); // 100 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Validate messageId
    if (
      !messageId ||
      typeof messageId !== "string" ||
      messageId.trim().length === 0
    ) {
      return errorResponse("Invalid or missing messageId", 400);
    }

    if (!userId) {
      return errorResponse("User ID not found in token", 401);
    }

    const doc = await db.collection(COL_VOICE_MESSAGES).doc(messageId).get();
    if (!doc.exists) return errorResponse("Voice message not found", 404);
    const voiceMessage = doc.data() as any;
    if (!voiceMessage) return errorResponse("Voice message not found", 404);

    if (
      voiceMessage.fromUserId !== userId &&
      voiceMessage.toUserId !== userId
    ) {
      return errorResponse("Unauthorized access to voice message", 403);
    }

    const file = adminStorage.bucket().file(voiceMessage.storagePath);
    const [audioUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

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
    devLog("error", "voice.url", "Failed to get voice message URL", {
      error: error instanceof Error ? error.message : String(error),
    });

    const isAuthError =
      error instanceof Error &&
      (error.message.includes("Unauthenticated") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("token"));

    return errorResponse(
      isAuthError ? "Authentication failed" : "Failed to get voice message URL",
      isAuthError ? 401 : 500
    );
  }
}