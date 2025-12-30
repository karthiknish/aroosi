import { z } from "zod";
import {
  createAuthenticatedHandler,
  ErrorCode,
  errorResponse,
  successResponse,
} from "@/lib/api/handler";
import { db, adminStorage } from "@/lib/firebaseAdmin";

// POST /api/images/blog
// Upload metadata for a blog image and retrieve its public URL.
// Requires a valid Bearer token. Only admins are authorized to call this.
// Exported at the bottom to avoid TDZ issues with const handlers.

const bodySchema = z
  .object({
    storageId: z.string().min(1),
    fileName: z.string().min(1).max(300),
    contentType: z.string().optional(),
    fileSize: z.number().int().positive().optional(),
  })
  .strict();

const blogImageHandler = createAuthenticatedHandler(
  async (ctx, body: z.infer<typeof bodySchema>) => {
    if (!ctx.user.isAdmin) {
      return errorResponse("Admin privileges required", 403, {
        correlationId: ctx.correlationId,
        code: ErrorCode.FORBIDDEN,
      });
    }

    const { storageId, fileName, contentType, fileSize } = body;

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;

    if (contentType && !ALLOWED_TYPES.includes(contentType)) {
      return errorResponse("Unsupported image type", 400, {
        correlationId: ctx.correlationId,
        code: ErrorCode.VALIDATION_ERROR,
      });
    }
    if (fileSize && fileSize > MAX_SIZE_BYTES) {
      return errorResponse("File too large. Max 5MB allowed.", 400, {
        correlationId: ctx.correlationId,
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    try {
      await db.collection("blogImages").doc(storageId).set(
        {
          storageId,
          fileName,
          contentType: contentType || null,
          fileSize: fileSize || null,
          uploadedBy: ctx.user.id,
          createdAt: Date.now(),
        },
        { merge: true }
      );

      let url: string | null = null;
      try {
        const bucket = adminStorage.bucket();
        const [exists] = await bucket.file(storageId).exists();
        if (exists) {
          const bucketName = bucket.name;
          url = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(
            storageId
          )}`;
        }
      } catch {}

      return successResponse(
        {
          storageId,
          fileName,
          url,
          placeholder: !url,
        },
        200,
        ctx.correlationId
      );
    } catch (err) {
      console.error("/api/images/blog Firestore write error", err);
      return errorResponse("Failed to record blog image metadata", 500, {
        correlationId: ctx.correlationId,
        code: ErrorCode.INTERNAL_ERROR,
      });
    }
  },
  {
    bodySchema,
    rateLimit: { identifier: "blog_images", maxRequests: 30 },
  }
);

export const POST = blogImageHandler;
