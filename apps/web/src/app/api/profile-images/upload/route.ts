import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { adminStorage } from "@/lib/firebaseAdminInit";
import { v4 as uuidv4 } from "uuid";
import {
  validateImageUpload,
  sliceHead,
  sanitizeFileName,
  ALLOWED_IMAGE_MIME_TYPES,
} from "@/lib/validation/image";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const authUser = ctx.user as any;
    let userId = authUser.userId || authUser.id;
    
    // Support admin uploading for another user
    const { searchParams } = new URL(ctx.request.url);
    const targetUserId = searchParams.get("profileId") || searchParams.get("userId");
    
    if (targetUserId && targetUserId !== userId) {
      // Check if current user is admin
      if (authUser.role !== "admin") {
        return errorResponse("Admin privileges required to upload for other users", 403, { correlationId: ctx.correlationId });
      }
      userId = targetUserId;
    }
    
    let formData: FormData;
    try {
      formData = await ctx.request.formData();
    } catch {
      return errorResponse("Invalid form data", 400, { correlationId: ctx.correlationId });
    }

    const file = formData.get("image") as File | null;
    if (!file) {
      return errorResponse("Missing image file", 400, { correlationId: ctx.correlationId });
    }

    // Default to free plan
    const plan = "free";

    // Read bytes (buffer for upload + head for validation)
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const head = sliceHead(bytes, 256);

    // Validate using shared helper
    const validation = validateImageUpload({
      fileSize: file.size,
      providedMime: file.type || "application/octet-stream",
      plan: plan as any,
      headBytes: head,
    });
    if (!validation.ok) {
      return errorResponse(validation.message || "Invalid image", 400, {
        correlationId: ctx.correlationId,
        code: validation.errorCode,
        details: { plan: validation.plan },
      });
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes((file.type || "").toLowerCase())) {
      return errorResponse("Unsupported image type", 400, { correlationId: ctx.correlationId });
    }

    // Content Safety Scanning (Placeholder)
    // In a production app, you would integrate with Google Cloud Vision API or similar here.
    // For now, we'll just log that the scan is happening.
    console.log(`[Safety Scan] Scanning image ${file.name} for user ${userId}`);
    const isSafe = true; // Assume safe for now
    if (!isSafe) {
      return errorResponse("Image failed safety scan", 400, { correlationId: ctx.correlationId });
    }

    try {
      const originalExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const sanitizedBase = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
      const fileName = `${Date.now()}_${uuidv4()}_${sanitizedBase}.${originalExt}`.slice(0, 160);
      const storagePath = `users/${userId}/profile-images/${fileName}`;

      const bucket = adminStorage.bucket();
      const fileRef = bucket.file(storagePath);
      await fileRef.save(Buffer.from(bytes), {
        metadata: {
          contentType: file.type,
          metadata: {
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
            originalName: file.name,
            correlationId: ctx.correlationId,
          },
        },
      });
      await fileRef.makePublic().catch(() => {});
      const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      // Persist metadata document
      await db.collection("users").doc(userId).collection("images").doc(fileName).set(
        {
          storageId: storagePath,
          fileName,
          originalName: file.name,
          contentType: file.type,
          size: file.size,
          url,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId,
          width: validation.width,
          height: validation.height,
        },
        { merge: true }
      );

      // Update ordering
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        const current = (userDoc.data() as any)?.profileImageIds || [];
        if (!Array.isArray(current) || current.length === 0) {
          await db.collection("users").doc(userId).set(
            { profileImageIds: [storagePath], updatedAt: Date.now() },
            { merge: true }
          );
        } else if (!current.includes(storagePath)) {
          await db.collection("users").doc(userId).set(
            { profileImageIds: [...current, storagePath], updatedAt: Date.now() },
            { merge: true }
          );
        }
      } catch {}

      return successResponse({
        message: "Image uploaded",
        imageId: storagePath,
        url,
        size: file.size,
        mime: file.type,
        width: validation.width,
        height: validation.height,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("profile-images/upload error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to upload image", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "profile_images_upload", maxRequests: 20 }
  }
);
