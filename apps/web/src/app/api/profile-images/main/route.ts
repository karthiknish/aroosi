import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { profileImagesMainSchema } from "@/lib/validation/apiSchemas/profileImages";

export const PUT = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof profileImagesMainSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { imageId } = body;

    try {
      const imageDocId = imageId.includes("/") ? imageId.split("/").pop()! : imageId;
      const imageDoc = await db
        .collection("users")
        .doc(userId)
        .collection("images")
        .doc(imageDocId)
        .get();

      if (!imageDoc.exists) {
        return errorResponse("Image not found in user's images", 404, { correlationId: ctx.correlationId });
      }

      const userSnap = await db.collection("users").doc(userId).get();
      const data = userSnap.data() || {};
      const current: string[] = Array.isArray(data.profileImageIds) ? data.profileImageIds : [];
      const storageId: string = imageDoc.data()?.storageId || imageId;
      const newOrder = [storageId, ...current.filter((id) => id !== storageId)];

      await db.collection("users").doc(userId).set(
        { profileImageIds: newOrder, updatedAt: Date.now() },
        { merge: true }
      );

      return successResponse({
        message: "Main profile image updated successfully",
        mainImageId: storageId,
        imageOrder: newOrder,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("profile-images/main error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to set main profile image", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: profileImagesMainSchema,
    rateLimit: { identifier: "profile_images_main", maxRequests: 30 }
  }
);
