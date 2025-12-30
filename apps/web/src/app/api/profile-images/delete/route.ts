/**
 * Alias route for mobile compatibility
 * Mobile calls DELETE /api/profile-images/delete?url=...
 * This provides the expected endpoint
 */

import { NextRequest } from "next/server";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { adminStorage, db } from "@/lib/firebaseAdmin";

export const DELETE = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    // Get URL from query params (mobile format)
    const request = ctx.request as NextRequest;
    const url = request.nextUrl.searchParams.get("url");
    
    if (!url) {
      return errorResponse("Missing url parameter", 400, { correlationId: ctx.correlationId });
    }

    try {
      // Extract storage path from URL
      // URLs typically look like: https://storage.googleapis.com/bucket/users/userId/imageName
      let storagePath = "";
      try {
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/users\/[^/]+\/.+/);
        if (pathMatch) {
          storagePath = pathMatch[0].substring(1); // Remove leading /
        }
      } catch {
        // URL parsing failed, try to extract from URL string directly
        const match = url.match(/users\/[^/]+\/[^/?]+/);
        if (match) {
          storagePath = match[0];
        }
      }

      if (!storagePath) {
        return errorResponse("Could not parse image URL", 400, { correlationId: ctx.correlationId });
      }

      // Verify ownership
      if (!storagePath.startsWith(`users/${userId}/`)) {
        return errorResponse("Unauthorized to delete this image", 403, { correlationId: ctx.correlationId });
      }

      // Delete from Firebase Storage
      try {
        const bucket = adminStorage.bucket();
        await bucket.file(storagePath).delete().catch(() => {});
      } catch {
        // Continue even if storage delete fails
      }

      // Delete from Firestore
      const imageId = storagePath.split("/").pop() || "";
      if (imageId) {
        await db
          .collection("users")
          .doc(userId)
          .collection("images")
          .doc(imageId)
          .delete()
          .catch(() => {});
      }

      // Update user's profileImageUrls to remove this URL
      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const userData = userSnap.data() as any;
        const currentUrls: string[] = Array.isArray(userData.profileImageUrls) ? userData.profileImageUrls : [];
        const currentIds: string[] = Array.isArray(userData.profileImageIds) ? userData.profileImageIds : [];
        
        const urlIndex = currentUrls.indexOf(url);
        if (urlIndex !== -1) {
          currentUrls.splice(urlIndex, 1);
          if (urlIndex < currentIds.length) {
            currentIds.splice(urlIndex, 1);
          }
          await userRef.update({
            profileImageUrls: currentUrls,
            profileImageIds: currentIds,
            updatedAt: Date.now(),
          });
        }
      }

      return successResponse({ success: true }, 200, ctx.correlationId);
    } catch (error) {
      console.error("profile-images/delete error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to delete image", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "profile_images_delete", maxRequests: 20 }
  }
);
