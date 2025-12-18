// Firebase migration: this route now delegates to Firebase Storage/Firestore.
// It remains at /api/profile-images for backward compatibility while clients
// are updated to use /api/profile-images/firebase. Convex dependencies removed.
// Supported operations:
//  GET    /api/profile-images               -> list current user's images
//  POST   /api/profile-images               -> save image metadata (after direct upload)
//  DELETE /api/profile-images (JSON body)   -> { storageId } deletes image
// Legacy fields (fileSize) are mapped to `size`.

import { z } from "zod";
import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { adminStorage, db } from "@/lib/firebaseAdmin";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_USER = 5;

// Zod schemas for request validation
const postBodySchema = z.object({
  storageId: z.string().min(1, "storageId is required"),
  fileName: z.string().min(1, "fileName is required"),
  contentType: z.string().min(1, "contentType is required"),
  size: z.number().optional(),
  fileSize: z.number().optional(), // legacy support
}).refine(
  (data) => typeof data.size === "number" || typeof data.fileSize === "number",
  { message: "size or fileSize is required" }
);

const deleteBodySchema = z.object({
  storageId: z.string().optional(),
  imageId: z.string().optional(), // legacy support
}).refine(
  (data) => data.storageId || data.imageId,
  { message: "storageId or imageId is required" }
);

async function listUserImages(userId: string) {
  let bucket: any;
  try {
    bucket = adminStorage.bucket();
  } catch (e) {
    const fallback =
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (process.env.GCLOUD_PROJECT
        ? `${process.env.GCLOUD_PROJECT}.appspot.com`
        : undefined);
    if (!fallback) throw e;
    bucket = adminStorage.bucket(fallback);
  }
  const [filesRaw] = await bucket.getFiles({
    prefix: `users/${userId}/profile-images/`,
  });
  const files: any[] = Array.isArray(filesRaw) ? filesRaw : [];
  return Promise.all(
    files
      .filter((f: any) => !f.name.endsWith("/"))
      .map(async (f: any) => {
        const [meta] = await f.getMetadata();
        // Use public URL since storage rules allow public read access
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${f.name}`;
        return {
          storageId: f.name,
          fileName: meta.name,
          url: publicUrl,
          size: Number(meta.size || 0),
          uploadedAt: meta.metadata?.uploadedAt || meta.timeCreated,
          contentType: meta.contentType || null,
        };
      })
  );
}

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const images = await listUserImages(userId);
      return successResponse({ images }, 200, ctx.correlationId);
    } catch (e) {
      console.error("profile-images GET firebase error", {
        error: e instanceof Error ? e.message : String(e),
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to fetch images", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "profile_images_get", maxRequests: 30 }
  }
);

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof postBodySchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const { storageId, fileName, contentType } = body;
      const size = body.size ?? body.fileSize!; // One of these is guaranteed by schema
      
      if (!String(storageId).startsWith(`users/${userId}/`)) {
        return errorResponse("Unauthorized storage path", 403, { correlationId: ctx.correlationId });
      }
      
      if (!ALLOWED_TYPES.includes(String(contentType).toLowerCase() as any)) {
        return errorResponse("Unsupported image type", 400, { correlationId: ctx.correlationId });
      }
      
      if (size > MAX_SIZE_BYTES) {
        return errorResponse("File too large", 400, { correlationId: ctx.correlationId });
      }
      
      // Enforce max images (Firestore count + storage listing best-effort)
      try {
        const existing = await listUserImages(userId);
        if (existing.length >= MAX_IMAGES_PER_USER) {
          return errorResponse(
            `You can only display up to ${MAX_IMAGES_PER_USER} images`, 
            400, 
            { correlationId: ctx.correlationId }
          );
        }
      } catch {}

      const imageId = String(storageId).split("/").pop() || String(storageId);
      
      // Get bucket for URL generation
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
      
      // Use public URL since storage rules allow public read access
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storageId}`;

      await db
        .collection("users")
        .doc(userId)
        .collection("images")
        .doc(imageId)
        .set(
          {
            storageId,
            fileName,
            contentType,
            size,
            url: publicUrl,
            uploadedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        
      return successResponse({ imageId, url: publicUrl }, 200, ctx.correlationId);
    } catch (e) {
      console.error("profile-images POST firebase error", {
        error: e instanceof Error ? e.message : String(e),
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to save metadata", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: postBodySchema,
    rateLimit: { identifier: "profile_images_post", maxRequests: 20 }
  }
);

export const DELETE = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof deleteBodySchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const storageId = body.storageId || body.imageId;
      
      if (!storageId) {
        return errorResponse("Missing storageId", 400, { correlationId: ctx.correlationId });
      }
      
      if (!storageId.startsWith(`users/${userId}/`)) {
        return errorResponse("Unauthorized", 403, { correlationId: ctx.correlationId });
      }
      
      let fileRef: any;
      try {
        fileRef = adminStorage.bucket().file(storageId);
      } catch (e) {
        const fallback =
          process.env.FIREBASE_STORAGE_BUCKET ||
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          (process.env.GCLOUD_PROJECT
            ? `${process.env.GCLOUD_PROJECT}.appspot.com`
            : undefined);
        if (!fallback) throw e;
        fileRef = adminStorage.bucket(fallback).file(storageId);
      }
      
      await fileRef.delete({ ignoreNotFound: true }).catch(() => {});
      
      const imageId = storageId.split("/").pop() || storageId;
      await db
        .collection("users")
        .doc(userId)
        .collection("images")
        .doc(imageId)
        .delete()
        .catch(() => {});
        
      return successResponse(undefined, 200, ctx.correlationId);
    } catch (e) {
      console.error("profile-images DELETE firebase error", {
        error: e instanceof Error ? e.message : String(e),
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to delete image", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: deleteBodySchema,
    rateLimit: { identifier: "profile_images_delete", maxRequests: 20 }
  }
);

// NOTE: Admin cross-user image management previously supported via Convex by
// passing an arbitrary userId. That functionality will be reintroduced via
// dedicated admin endpoints (e.g. /api/admin/profiles/[id]/images/*) if still
// required. This legacy route now only acts on the authenticated user's images.
