import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";

// POST /api/images/blog
// Upload metadata for a blog image and retrieve its public URL.
// Requires a valid Bearer token. Only admins are authorized to call this.
export async function POST(req: NextRequest) {
  // Extract Bearer token
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return errorResponse("Unauthorized", 401);
  }

  // Parse body
  let body: {
    storageId?: string;
    fileName?: string;
    contentType?: string;
    fileSize?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { storageId, fileName, contentType, fileSize } = body;
  if (!storageId || !fileName) {
    return errorResponse("Missing storageId or fileName", 400);
  }

  // Basic validation for image types/sizes (mirror profile image rules)
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  if (contentType && !ALLOWED_TYPES.includes(contentType)) {
    return errorResponse("Unsupported image type", 400);
  }
  if (fileSize && fileSize > MAX_SIZE_BYTES) {
    return errorResponse("File too large. Max 5MB allowed.", 400);
  }

  // Call Convex mutation (admin guard happens server-side)
  try {
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);
    const result = await convex.mutation(api.images.uploadBlogImage, {
      storageId,
      fileName,
      contentType,
      fileSize,
    });

    if (
      !result ||
      typeof result !== "object" ||
      !(result as { success?: boolean }).success
    ) {
      return errorResponse(
        (result as { message?: string }).message || "Upload failed",
        400
      );
    }
    return successResponse(result);
  } catch (err) {
    console.error("/api/images/blog POST error", err);
    const message =
      err instanceof Error ? err.message : "Failed to upload image";
    return errorResponse(message, 500);
  }
}
