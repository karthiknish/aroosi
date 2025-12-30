import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db, adminStorage } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { COL_VOICE_MESSAGES } from "@/lib/firestoreSchema";

interface RouteContext {
  params: Promise<{ messageId: string }>;
}

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext, _body: unknown, routeCtx?: RouteContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const params = routeCtx ? await routeCtx.params : null;
    const messageId = params?.messageId;

    if (!messageId || typeof messageId !== "string" || messageId.trim().length === 0) {
      return errorResponse("Invalid or missing messageId", 400, { correlationId: ctx.correlationId });
    }

    try {
      const doc = await db.collection(COL_VOICE_MESSAGES).doc(messageId).get();
      if (!doc.exists) {
        return errorResponse("Voice message not found", 404, { correlationId: ctx.correlationId });
      }
      
      const voiceMessage = doc.data() as any;
      if (!voiceMessage) {
        return errorResponse("Voice message not found", 404, { correlationId: ctx.correlationId });
      }

      // Authorization check
      if (voiceMessage.fromUserId !== userId && voiceMessage.toUserId !== userId) {
        return errorResponse("Unauthorized access to voice message", 403, { correlationId: ctx.correlationId });
      }

      const file = adminStorage.bucket().file(voiceMessage.storagePath);
      const [audioUrl] = await file.getSignedUrl({
        action: "read",
        expires: nowTimestamp() + 60 * 60 * 1000,
      });

      if (!audioUrl) {
        return errorResponse("Failed to generate audio URL", 500, { correlationId: ctx.correlationId });
      }

      return successResponse({
        audioUrl,
        duration: voiceMessage.duration,
        fileSize: voiceMessage.fileSize,
        mimeType: voiceMessage.mimeType,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("voice-messages/[messageId]/url error", { error, correlationId: ctx.correlationId });
      
      const isAuthError = error instanceof Error && (
        error.message.includes("Unauthenticated") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("token")
      );

      return errorResponse(
        isAuthError ? "Authentication failed" : "Failed to get voice message URL",
        isAuthError ? 401 : 500,
        { correlationId: ctx.correlationId }
      );
    }
  },
  {
    rateLimit: { identifier: "voice_messages_url", maxRequests: 100 }
  }
);