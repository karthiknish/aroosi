import { NextRequest } from "next/server";
import { db, adminStorage } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext,
} from "@/lib/api/handler";

interface RouteContext {
  params: Promise<{ messageId: string }>;
}

export const GET = createAuthenticatedHandler(
  async (ctx: AuthenticatedApiContext, _req: NextRequest, routeCtx?: RouteContext) => {
    if (!routeCtx) return errorResponse("Missing context", 400);
    const { messageId } = await routeCtx.params;
    const userId = ctx.user.id;

    // 1. Get image metadata from firestore
    const imageSnap = await db
      .collection("messageImages")
      .doc(messageId)
      .get();

    if (!imageSnap.exists) {
      return errorResponse("Image metadata not found", 404, {
        correlationId: ctx.correlationId,
      });
    }

    const imageData = imageSnap.data() as any;

    // 2. Check permission (must be part of conversation)
    const convSnap = await db
      .collection("conversations")
      .doc(imageData.conversationId)
      .get();
      
    if (!convSnap.exists || !convSnap.data()?.userIds.includes(userId)) {
      return errorResponse("Unauthorized", 403, {
        correlationId: ctx.correlationId,
      });
    }

    // 3. Generate signed URL
    const storagePath = imageData.storagePath;
    if (!storagePath) {
      return errorResponse("Storage path missing", 500, {
        correlationId: ctx.correlationId,
      });
    }

    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);
    const [imageUrl] = await file.getSignedUrl({
      action: "read",
      expires: nowTimestamp() + 60 * 60 * 1000, // 1h
    });
    
    if (!imageUrl) {
      return errorResponse("Failed to generate playback URL", 500, {
        correlationId: ctx.correlationId,
      });
    }

    return successResponse({ imageUrl }, 200, ctx.correlationId);
  }
);
