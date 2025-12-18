import { NextRequest } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db, adminStorage } from "@/lib/firebaseAdmin";
import { successResponse, errorResponse } from "@/lib/apiResponse";

// GET /api/message-images/:messageId/url -> returns a signed URL for the image message
export async function GET(request: NextRequest, ctx: { params: Promise<{ messageId: string }> }) {
  return withFirebaseAuth(async (authUser, request: NextRequest, _ctx) => {
    const correlationId = Math.random().toString(36).slice(2, 10);
    try {
      const userId = authUser.id;
      
      // Get messageId from params (Next.js 15+ async params)
      const params = await ctx.params;
      const messageId = params.messageId;
      
      if (!messageId) {
        return errorResponse("Missing messageId", 400, { correlationId });
      }

      // Load message
      const ref = db.collection("messages").doc(messageId);
      const snap = await ref.get();
      if (!snap.exists) {
        return errorResponse("Message not found", 404, { correlationId });
      }
      const m = snap.data() as any;
      if (!m || m.type !== "image") {
        return errorResponse("Not an image message", 400, { correlationId });
      }

      // AuthZ: requester must be a participant
      if (m.fromUserId !== userId && m.toUserId !== userId) {
        return errorResponse("Forbidden", 403, { correlationId });
      }

      const storagePath: string | undefined = m.audioStorageId || m.storageId;
      if (!storagePath || typeof storagePath !== "string") {
        return errorResponse("Storage path missing", 500, { correlationId });
      }

      // Resolve bucket defensively (mirrors logic used elsewhere)
      let bucket: any;
      try {
        bucket = adminStorage.bucket();
      } catch (e) {
        const fallbackName =
          process.env.FIREBASE_STORAGE_BUCKET ||
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          (process.env.GCLOUD_PROJECT
            ? `${process.env.GCLOUD_PROJECT}.appspot.com`
            : undefined);
        if (!fallbackName) throw e;
        bucket = adminStorage.bucket(fallbackName);
      }

      const file = bucket.file(storagePath);
      const [imageUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000, // 1h
      });
      if (!imageUrl) {
        return errorResponse("Failed to sign image URL", 500, { correlationId });
      }

      return successResponse({
        imageUrl,
        contentType: m.mimeType || "image/jpeg",
        fileSize: m.fileSize || undefined,
        width: m.width || undefined,
        height: m.height || undefined,
        correlationId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResponse(message || "Failed to get image URL", 500, {
        correlationId,
      });
    }
  })(request, ctx);
}
