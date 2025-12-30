import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { db } from "@/lib/firebaseAdmin";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    let body: any = {};
    try {
      body = await ctx.request.json();
    } catch {}
    
    const { fileName, uploadId } = body;
    
    if (!fileName || !uploadId) {
      return errorResponse("Missing fileName or uploadId", 400, { correlationId: ctx.correlationId });
    }
    
    try {
      const docId = uploadId.split("/").pop() || uploadId;
      const snap = await db.collection("users").doc(userId).collection("images").doc(docId).get();
      
      if (!snap.exists) {
        return errorResponse("Image not found", 404, { correlationId: ctx.correlationId });
      }

      return successResponse({
        message: "Image upload confirmed",
        fileName,
        uploadId,
        confirmedAt: nowTimestamp(),
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("profile-images/confirm error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to confirm image upload", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "profile_images_confirm", maxRequests: 30 }
  }
);
