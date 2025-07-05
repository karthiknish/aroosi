import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

// GET /api/profile-images -> get user's profile images
// POST /api/profile-images -> upload profile image metadata
// DELETE /api/profile-images -> delete a profile image (expects JSON body { userId, imageId })

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);

    // Get profile images for the user
    if (!userId) {
      return errorResponse("User ID not found", 401);
    }

    const images = await convex.query(api.images.getProfileImages, {
      userId: userId as Id<"users">,
    });
    return successResponse({ images });
  } catch (error) {
    console.error("Error fetching profile images:", error);
    return errorResponse("Failed to fetch profile images", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);

    let body: { imageId?: string } = {};
    try {
      body = await req.json();
    } catch {}
    const { imageId } = body;
    if (!imageId) {
      return errorResponse("Missing imageId", 400);
    }

    const result = await convex.mutation(api.images.deleteProfileImage, {
      userId: userId as Id<"users">,
      imageId: imageId as Id<"_storage">,
    });
    if (result.success) return successResponse();
    return errorResponse(result.message || "Failed to delete image", 400);
  } catch (error) {
    return errorResponse("Failed to delete image", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);

    let body: {
      storageId?: string;
      fileName?: string;
      contentType?: string;
      fileSize?: number;
    } = {};
    try {
      body = await req.json();
    } catch {}

    const { storageId, fileName, contentType, fileSize } = body;
    if (!storageId || !fileName || !contentType || !fileSize) {
      return errorResponse("Missing required fields", 400);
    }

    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    const MAX_IMAGES_PER_USER = 5;

    if (!ALLOWED_TYPES.includes(contentType as string)) {
      return errorResponse("Unsupported image type", 400);
    }
    if (typeof fileSize !== "number" || fileSize > MAX_SIZE_BYTES) {
      return errorResponse("File too large. Max 5MB allowed.", 400);
    }

    // Check current image count
    const existingImages = await convex.query(api.images.getProfileImages, {
      userId: userId as Id<"users">,
    });
    if (
      Array.isArray(existingImages) &&
      existingImages.length >= MAX_IMAGES_PER_USER
    ) {
      return errorResponse(
        `You can only display up to ${MAX_IMAGES_PER_USER} images on your profile`,
        400,
      );
    }

    const result = await convex.mutation(api.images.uploadProfileImage, {
      userId: userId as Id<"users">,
      storageId: storageId as Id<"_storage">,
      fileName,
      contentType,
      fileSize,
    });
    if (
      !result ||
      typeof result !== "object" ||
      (result as { success?: boolean }).success !== true
    ) {
      return errorResponse(
        (result as { message?: string }).message || "Upload failed",
        400,
      );
    }
    return successResponse(result);
  } catch (err) {
    console.error("/api/profile-images POST error", err);
    return errorResponse(
      err instanceof Error ? err.message : "Failed to upload image",
      500,
    );
  }
}
