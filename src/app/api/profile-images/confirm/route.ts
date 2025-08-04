import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";

export async function POST(request: NextRequest) {
  try {
    // Cookie-only auth
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    let client = getConvexClient();
    if (!client) client = getConvexClient();
    if (!client) return errorResponse("Service temporarily unavailable", 503);
    // No client.setAuth with bearer tokens in cookie-only model

    // Query the profile by user ID
    if (!userId) {
      return errorResponse("User ID not found", 401);
    }

    const profile = await client.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (!profile) return errorResponse("Profile not found", 404);

    const { fileName, uploadId } = await request.json();
    if (!fileName || !uploadId)
      return errorResponse("Missing fileName or uploadId", 400);

    // In a real implementation, you would:
    // 1. Verify the upload was successful to storage
    // 2. Update the image record status to confirmed
    // 3. Generate optimized versions/thumbnails
    // 4. Update profile image URLs

    console.log(
      `Confirming image upload for user ${userId}: ${fileName} (${uploadId})`
    );

    return successResponse({
      message: "Image upload confirmed",
      fileName,
      uploadId,
      confirmedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error confirming image upload:", error);
    return errorResponse("Failed to confirm image upload", 500);
  }
}
