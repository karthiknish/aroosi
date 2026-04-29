import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
} from "@/lib/api/handler";
import type { ApiContext } from "@/lib/api/handler";
import {
  uploadMessageImage,
  sendFirebaseMessage,
} from "@/lib/messages/firebaseMessages";
import {
  validateImageUpload,
  sanitizeFileName,
  sliceHead,
} from "@/lib/validation/image";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const user = ctx.user;
    if (!user) {
      return errorResponse("Unauthorized", 401, { correlationId: ctx.correlationId });
    }
    const userId = user.userId || user.id;

    let formData: FormData;
    try {
      formData = await ctx.request.formData();
    } catch {
      return errorResponse("Invalid multipart form data", 400, { correlationId: ctx.correlationId });
    }

    const image = formData.get("image") as File | null;
    const conversationId = (formData.get("conversationId") as string | null) || "";
    const fromUserId = (formData.get("fromUserId") as string | null) || "";
    const toUserId = (formData.get("toUserId") as string | null) || "";
    const rawFileName = (formData.get("fileName") as string | null) || image?.name || "image";
    const contentType = (formData.get("contentType") as string | null) || image?.type || "application/octet-stream";

    if (!image) {
      return errorResponse("Missing image file", 400, { correlationId: ctx.correlationId });
    }
    if (!conversationId || !fromUserId || !toUserId) {
      return errorResponse("Missing required fields", 400, {
        correlationId: ctx.correlationId,
        details: { fields: { conversationId: !!conversationId, fromUserId: !!fromUserId, toUserId: !!toUserId } },
      });
    }
    if (fromUserId !== userId) {
      return errorResponse("Unauthorized sender", 403, {
        correlationId: ctx.correlationId,
      });
    }

    // Participant check
    const userIds = conversationId.split("_");
    if (!userIds.includes(userId)) {
      return errorResponse("Unauthorized access to conversation", 403, { correlationId: ctx.correlationId });
    }

    try {
      const arrayBuffer = await image.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const head = sliceHead(bytes, 256);

      const validation = validateImageUpload({
        fileSize: image.size,
        providedMime: contentType,
        plan: "free",
        headBytes: head,
      });
      if (!validation.ok) {
        return errorResponse(validation.message || "Invalid image upload", 400, { correlationId: ctx.correlationId });
      }

      const fileName = sanitizeFileName(rawFileName);
      const { storageId } = await uploadMessageImage({ conversationId, fileName, contentType, bytes });

      const message = await sendFirebaseMessage({
        conversationId,
        fromUserId,
        toUserId,
        type: "image",
        audioStorageId: storageId,
        fileSize: image.size,
        mimeType: contentType,
        ...(typeof validation.width === "number" && validation.width > 0 ? { width: validation.width } : {}),
        ...(typeof validation.height === "number" && validation.height > 0 ? { height: validation.height } : {}),
      });
      const messageMeta = message as { id?: string; _id?: string };

      return successResponse({
        message: "Image message uploaded successfully",
        messageId: messageMeta.id || messageMeta._id,
        storageId,
        size: image.size,
        mime: contentType,
        width: validation.width,
        height: validation.height,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("messages/upload-image error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to upload image message", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "messages_upload_image", maxRequests: 30 }
  }
);
