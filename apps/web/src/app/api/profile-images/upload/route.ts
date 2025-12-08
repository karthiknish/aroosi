import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { adminStorage } from "@/lib/firebaseAdminInit";
import { v4 as uuidv4 } from "uuid";
import {
  validateImageUpload,
  sliceHead,
  sanitizeFileName,
  ALLOWED_IMAGE_MIME_TYPES,
} from "@/lib/validation/image";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";

// NOTE: Legacy constants replaced by shared validation helper. Retained names commented for reference.
// const ALLOWED_TYPES = [...];
// const MAX_BYTES = 5 * 1024 * 1024;

export const POST = withFirebaseAuth(async (user, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse("Invalid form data", 400, { correlationId });
    }

    const file = formData.get("image") as File | null;
    if (!file) {
      return errorResponse("Missing image file", 400, { correlationId });
    }

    // Fetch subscription plan (best-effort; falls back to free)
    let plan: string = "free";
    try {
      const status =
        await subscriptionRateLimiter.getSubscriptionStatus(request);
      plan = status.plan || "free";
    } catch {}

    // Read bytes (buffer for upload + head for validation)
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const head = sliceHead(bytes, 256);

    // Validate (size, mime, signature) using shared helper
    const validation = validateImageUpload({
      fileSize: file.size,
      providedMime: file.type || "application/octet-stream",
      plan: plan as any,
      headBytes: head,
    });
    if (!validation.ok) {
      return errorResponse(validation.message || "Invalid image", 400, {
        correlationId,
        plan: validation.plan,
        errorCode: validation.errorCode,
        limitBytes: validation.limitBytes,
        allowedMimes: validation.allowedMimes,
        detectedMime: validation.detectedMime,
        size: file.size,
        width: validation.width,
        height: validation.height,
      });
    }

    // Additional allowlist guard for any legacy UI expecting old types (should be redundant)
    if (!ALLOWED_IMAGE_MIME_TYPES.includes((file.type || "").toLowerCase())) {
      return errorResponse("Unsupported image type", 400, { correlationId });
    }

    // Generate sanitized + unique filename
    const originalExt = (file.name.split(".").pop() || "jpg").toLowerCase();
    const sanitizedBase =
      sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
    const fileName =
      `${Date.now()}_${uuidv4()}_${sanitizedBase}.${originalExt}`.slice(0, 160);
    const storagePath = `users/${user.id}/profile-images/${fileName}`;

    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(storagePath);
    await fileRef.save(Buffer.from(bytes), {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: user.id,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          subscriptionPlan: plan,
          correlationId,
        },
      },
    });
    await fileRef.makePublic().catch(() => {});
    const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Persist metadata document
    await db
      .collection("users")
      .doc(user.id)
      .collection("images")
      .doc(fileName)
      .set(
        {
          storageId: storagePath,
          fileName,
          originalName: file.name,
          contentType: file.type,
          size: file.size,
          url,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.id,
          plan,
          width: validation.width,
          height: validation.height,
        },
        { merge: true }
      );

    // Update ordering if first or append if not present
    try {
      const userDoc = await db.collection("users").doc(user.id).get();
      const current = (userDoc.data() as any)?.profileImageIds || [];
      if (!Array.isArray(current) || current.length === 0) {
        await db
          .collection("users")
          .doc(user.id)
          .set(
            { profileImageIds: [storagePath], updatedAt: Date.now() },
            { merge: true }
          );
      } else if (!current.includes(storagePath)) {
        await db
          .collection("users")
          .doc(user.id)
          .set(
            {
              profileImageIds: [...current, storagePath],
              updatedAt: Date.now(),
            },
            { merge: true }
          );
      }
    } catch (e) {
      console.warn("profile-images.upload ordering update warning", {
        correlationId,
        error: (e as Error)?.message,
      });
    }

    return successResponse(
      {
        message: "Image uploaded",
        imageId: storagePath,
        url,
        correlationId,
        durationMs: Date.now() - startedAt,
        plan,
        size: file.size,
        mime: file.type,
        width: validation.width,
        height: validation.height,
      },
      200
    );
  } catch (error) {
    console.error("profile-images.upload firebase error", error);
    return errorResponse("Failed to upload image", 500, { correlationId });
  }
});
