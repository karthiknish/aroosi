/**
 * Alias route for mobile compatibility
 * Mobile app calls /api/profile-images/reorder
 * This redirects to the existing /api/profile-images/order endpoint
 */

import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

// Mobile-friendly schema (accepts 'photos' array)
const reorderSchema = z.object({
  photos: z.array(z.string()).optional(),
  profileId: z.string().optional(),
  imageIds: z.array(z.string()).optional(),
});

// Type for the transformed body
interface ReorderBody {
  imageIds: string[];
  profileId?: string;
}

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, rawBody: z.infer<typeof reorderSchema>) => {
    // Mobile sends 'photos', web sends 'imageIds'
    const body: ReorderBody = {
      imageIds: rawBody.imageIds || rawBody.photos || [],
      profileId: rawBody.profileId,
    };
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const profileId = body.profileId || userId;
    const imageIds = body.imageIds;

    // Authorization
    if (userId !== profileId && (ctx.user as any).role !== "admin") {
      return errorResponse("Unauthorized", 403, { correlationId: ctx.correlationId });
    }

    if (!imageIds || imageIds.length === 0) {
      return errorResponse("No images provided", 400, { correlationId: ctx.correlationId });
    }

    try {
      const imagesCol = db.collection("users").doc(profileId).collection("images");
      const docIds = imageIds.map((imgId) => imgId.includes("/") ? imgId.split("/").pop()! : imgId);
      const imageDocs = await Promise.all(
        docIds.map(async (docId) => {
          const snap = await imagesCol.doc(docId).get();
          return { docId, snap };
        })
      );

      const invalid = imageDocs.filter((d) => !d.snap.exists).map((d) => d.docId);
      if (invalid.length) {
        return errorResponse("Some provided image IDs do not exist", 422, {
          correlationId: ctx.correlationId,
          code: "INVALID_IMAGE_IDS",
          invalidIds: invalid,
        });
      }

      const normalized: string[] = [];
      const storageIdToUrl: Record<string, string> = {};
      for (const { docId, snap } of imageDocs) {
        const data = snap.data() as any;
        const storageId = data?.storageId || docId;
        normalized.push(storageId);
        if (data?.url) storageIdToUrl[storageId] = data.url;
      }

      const userRef = db.collection("users").doc(profileId);
      const userSnap = await userRef.get();
      let urls: string[] = [];

      if (userSnap.exists) {
        const d = userSnap.data() as any;
        const existingUrls: string[] = Array.isArray(d.profileImageUrls) ? d.profileImageUrls.slice() : [];
        const existingIds: string[] = Array.isArray(d.profileImageIds) ? d.profileImageIds : [];
        const map: Record<string, string> = {};
        existingIds.forEach((id, idx) => { map[id] = existingUrls[idx]; });
        urls = normalized.map((id) => storageIdToUrl[id] || map[id] || "");
      } else {
        urls = normalized.map((id) => storageIdToUrl[id] || "");
      }

      await userRef.set(
        {
          profileImageIds: normalized,
          profileImageUrls: urls,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      return successResponse({
        success: true,
        normalizedCount: normalized.length,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("profile-images/reorder error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to reorder images", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: reorderSchema,
    rateLimit: { identifier: "profile_images_reorder", maxRequests: 30 }
  }
);
