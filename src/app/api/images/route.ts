import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return errorResponse("Unauthorized", 401);
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  let body: { userId?: string; imageId?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const { userId, imageId } = body;
  if (!userId || !imageId) {
    return errorResponse("Missing userId or imageId", 400);
  }
  // Call the Convex mutation to delete the image
  try {
    const result = await convex.mutation(api.images.deleteProfileImage, {
      userId: userId as Id<"users">,
      imageId: imageId as Id<"_storage">,
    });
    if (result.success) {
      return successResponse();
    } else {
      return errorResponse(result.message || "Failed to delete image", 400);
    }
  } catch {
    return errorResponse("Failed to delete image", 500);
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return errorResponse("Unauthorized", 401);
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  let body: {
    userId?: string;
    storageId?: string;
    fileName?: string;
    contentType?: string;
    fileSize?: number;
  } = {};
  try {
    body = await req.json();
  } catch {}
  const { userId, storageId, fileName, contentType, fileSize } = body;

  // Basic validation
  if (!userId || !storageId || !fileName || !contentType || !fileSize) {
    return errorResponse("Missing required fields", 400);
  }

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  if (!ALLOWED_TYPES.includes(contentType as string)) {
    return errorResponse("Unsupported image type", 400);
  }

  if (typeof fileSize !== "number" || fileSize > MAX_SIZE_BYTES) {
    return errorResponse("File too large. Max 5MB allowed.", 400);
  }

  try {
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
        400
      );
    }
    return successResponse(result);
  } catch (err) {
    console.error("/api/images POST error", err);
    const message = err instanceof Error ? err.message : "Failed to upload image";
    return errorResponse(message, 500);
  }
}
