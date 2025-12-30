import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { db } from "@/lib/firebaseAdmin";
import { profileImagesOrderSchema } from "@/lib/validation/apiSchemas/profileImages";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof profileImagesOrderSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const profileId = body.profileId || userId;
    const imageIds = body.imageIds || body.photos;
    const { skipUrlReorder, rebuildUrls } = body;

    if (!imageIds || imageIds.length === 0) {
      return errorResponse("No images provided", 400, { correlationId: ctx.correlationId });
    }

    // Authorization
    if (userId !== profileId && (ctx.user as any).role !== "admin") {
      return errorResponse("Unauthorized", 403, { correlationId: ctx.correlationId });
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
          details: { invalidIds: invalid },
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

      if (!skipUrlReorder) {
        if (rebuildUrls) {
          urls = normalized.map((id) => storageIdToUrl[id] || "");
        } else if (userSnap.exists) {
          const d = userSnap.data() as any;
          const existingUrls: string[] = Array.isArray(d.profileImageUrls) ? d.profileImageUrls.slice() : [];
          const existingIds: string[] = Array.isArray(d.profileImageIds) ? d.profileImageIds : [];
          const map: Record<string, string> = {};
          existingIds.forEach((id, idx) => { map[id] = existingUrls[idx]; });
          urls = normalized.map((id) => storageIdToUrl[id] || map[id] || "");
        } else {
          urls = normalized.map((id) => storageIdToUrl[id] || "");
        }
      } else if (userSnap.exists) {
        const d = userSnap.data() as any;
        const existingUrls: string[] = Array.isArray(d.profileImageUrls) ? d.profileImageUrls.slice() : [];
        urls = existingUrls.length === normalized.length ? existingUrls : normalized.map((id, idx) => existingUrls[idx] || "");
      }

      await userRef.set(
        {
          profileImageIds: normalized,
          ...(skipUrlReorder ? {} : { profileImageUrls: urls }),
          updatedAt: nowTimestamp(),
        },
        { merge: true }
      );

      return successResponse({
        normalizedCount: normalized.length,
        reorderedUrls: !skipUrlReorder,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("profile-images/order error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to update order", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: profileImagesOrderSchema,
    rateLimit: { identifier: "profile_images_order", maxRequests: 30 }
  }
);
