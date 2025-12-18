import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import {
  uploadMessageImage,
  sendFirebaseMessage,
} from "@/lib/messages/firebaseMessages";
import {
  validateImageUpload,
  sanitizeFileName,
  sliceHead,
} from "@/lib/validation/image";
import { db } from "@/lib/firebaseAdmin";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;

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
        fields: { conversationId: !!conversationId, fromUserId: !!fromUserId, toUserId: !!toUserId },
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
        plan: "free" as any,
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

      // Denormalize lastMessage
      try {
        const now = Date.now();
        const convRef = db.collection("conversations").doc(conversationId);
        await convRef.set(
          {
            participants: [fromUserId, toUserId],
            lastMessage: {
              id: (message as any)?.id || (message as any)?._id,
              fromUserId,
              toUserId,
              text: "",
              type: "image",
              createdAt: (message as any)?.createdAt || now,
            },
            updatedAt: (message as any)?.createdAt || now,
          },
          { merge: true }
        );

        const a = [fromUserId, toUserId].sort();
        const q1 = await db.collection("matches")
          .where("user1Id", "==", a[0])
          .where("user2Id", "==", a[1])
          .where("status", "==", "matched")
          .limit(1)
          .get();
        const matchDoc = !q1.empty ? q1.docs[0] : null;
        if (matchDoc) {
          await db.collection("matches").doc(matchDoc.id).set(
            {
              lastMessage: {
                id: (message as any)?.id || (message as any)?._id,
                fromUserId,
                toUserId,
                text: "",
                type: "image",
                createdAt: (message as any)?.createdAt || now,
              },
              updatedAt: (message as any)?.createdAt || now,
            },
            { merge: true }
          );
        }
      } catch {}

      return successResponse({
        message: "Image message uploaded successfully",
        messageId: (message as any)?._id,
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
