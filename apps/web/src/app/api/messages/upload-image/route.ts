import { NextRequest } from "next/server";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import {
  uploadMessageImage,
  sendFirebaseMessage,
} from "@/lib/messages/firebaseMessages";
import {
  validateImageUpload,
  sanitizeFileName,
  sliceHead,
} from "@/lib/validation/image";

// Accepts multipart/form-data with fields:
// - image: File (required)
// - conversationId: string (required, "userA_userB")
// - fromUserId: string (required)
// - toUserId: string (required)
// - fileName: string (optional - fallback to image.name)
// - contentType: string (optional - fallback to image.type)
// Emits SSE "message_sent" after successful Convex insert.
export async function POST(request: NextRequest) {
  return withFirebaseAuth(async (authUser, request: NextRequest, _ctx) => {
    const correlationId = Math.random().toString(36).slice(2, 10);
    const startedAt = Date.now();
    try {
      const userId = authUser.id;

      // Subscription-aware rate limit for image message upload
      // Cookie-only: pass empty string for token parameter to satisfy current signature
      const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
        request,
        "",
        userId || "unknown",
        "message_sent",
        60_000
      );
      if (!rate.allowed) {
        return errorResponse(rate.error || "Rate limit exceeded", 429, {
          correlationId,
          plan: rate.plan,
          limit: rate.limit,
          remaining: rate.remaining,
          resetTime: new Date(rate.resetTime).toISOString(),
        });
      }

      // Parse multipart form-data
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return errorResponse("Invalid multipart form data", 400, {
          correlationId,
        });
      }

      const image = formData.get("image") as File | null;
      const conversationId =
        (formData.get("conversationId") as string | null) || "";
      const fromUserId = (formData.get("fromUserId") as string | null) || "";
      const toUserId = (formData.get("toUserId") as string | null) || "";
      const rawFileName =
        (formData.get("fileName") as string | null) || image?.name || "image";
      const contentType =
        (formData.get("contentType") as string | null) ||
        image?.type ||
        "application/octet-stream";

      if (!image) {
        return errorResponse("Missing image file", 400, { correlationId });
      }
      if (!conversationId || !fromUserId || !toUserId) {
        return errorResponse("Missing required fields", 400, {
          correlationId,
          fields: {
            conversationId: !!conversationId,
            fromUserId: !!fromUserId,
            toUserId: !!toUserId,
          },
        });
      }

      // Participant check (cookie user must be in conversation)
      if (!userId) {
        return errorResponse("User ID not found", 401, { correlationId });
      }
      const userIds = conversationId.split("_");
      if (!userIds.includes(userId)) {
        return errorResponse("Unauthorized access to conversation", 403, {
          correlationId,
        });
      }

      // Build bytes for upload (we also slice a head for signature sniff)
      const arrayBuffer = await image.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const head = sliceHead(bytes, 256);

      // Plan-aware validation (we already derived plan from rate limiter response)
      const plan = rate.plan as any;
      const validation = validateImageUpload({
        fileSize: image.size,
        providedMime: contentType,
        plan,
        headBytes: head,
      });
      if (!validation.ok) {
        return errorResponse(validation.message || "Invalid image upload", 400, {
          correlationId,
          errorCode: validation.errorCode,
          limitBytes: validation.limitBytes,
          plan: validation.plan,
          allowedMimes: validation.allowedMimes,
          detectedMime: validation.detectedMime,
          size: image.size,
          width: validation.width,
          height: validation.height,
        });
      }

      // Sanitize filename after validation
      const fileName = sanitizeFileName(rawFileName);

      // Upload image to Firebase Storage
      const { storageId } = await uploadMessageImage({
        conversationId,
        fileName,
        contentType,
        bytes,
      });

      // Create message document (store dimensions if validator extracted)
      const message = await sendFirebaseMessage({
        conversationId,
        fromUserId,
        toUserId,
        type: "image",
        // Keep field name aligned with existing schema where image storage used audioStorageId
        audioStorageId: storageId,
        fileSize: image.size,
        mimeType: contentType,
        // Optional metadata forwarded from validator
        ...(typeof validation.width === "number" && validation.width > 0
          ? { width: validation.width }
          : {}),
        ...(typeof validation.height === "number" && validation.height > 0
          ? { height: validation.height }
          : {}),
      });

      // Denormalize lastMessage to conversations and matches collections for list UIs
      try {
        const { db } = await import("@/lib/firebaseAdmin");
        const now = Date.now();
        // Upsert conversation lastMessage
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
              ...(typeof (message as any)?.width === "number"
                ? { width: (message as any).width }
                : {}),
              ...(typeof (message as any)?.height === "number"
                ? { height: (message as any).height }
                : {}),
            },
            updatedAt: (message as any)?.createdAt || now,
          },
          { merge: true }
        );

        // Update matches lastMessage (for both participant orderings)
        const a = [fromUserId, toUserId].sort();
        const a1 = a[0];
        const a2 = a[1];
        const matchesColl = db.collection("matches");
        const q1 = await matchesColl
          .where("user1Id", "==", a1)
          .where("user2Id", "==", a2)
          .where("status", "==", "matched")
          .limit(1)
          .get();
        const matchDoc = !q1.empty ? q1.docs[0] : null;
        if (matchDoc) {
          await matchesColl.doc(matchDoc.id).set(
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
      } catch {
        // non-fatal denormalization failure
      }

      return successResponse(
        {
          message: "Image message uploaded successfully",
          messageId: (message as any)?._id,
          storageId,
          correlationId,
          durationMs: Date.now() - startedAt,
          plan,
          size: image.size,
          mime: contentType,
          width: validation.width,
          height: validation.height,
        },
        200
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResponse(message || "Failed to upload image message", 500, {
        correlationId,
      });
    }
  })(request, {});
}
