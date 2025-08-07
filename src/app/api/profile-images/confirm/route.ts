import { NextRequest } from "next/server";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth/requireAuth";
import { convexQueryWithAuth } from "@/lib/convexServer";

export async function POST(request: NextRequest) {
  try {
    try {
      await requireAuth(request);
    } catch (e) {
      if (e instanceof AuthError) {
        return authErrorResponse(e.message, { status: e.status, code: e.code });
      }
      return authErrorResponse("Authentication failed", {
        status: 401,
        code: "ACCESS_INVALID",
      });
    }

    const { userId } = await requireAuth(request);
    if (!userId) {
      return errorResponse("User ID not found", 401);
    }

    // Ensure profile exists
    const profile = await convexQueryWithAuth(
      request,
      (await import("@convex/_generated/api")).api.profiles.getProfileByUserId,
      { userId: userId as Id<"users"> }
    );
    if (!profile) return errorResponse("Profile not found", 404);

    const { fileName, uploadId } = (await request.json()) as {
      fileName?: string;
      uploadId?: string;
    };
    if (!fileName || !uploadId) {
      return errorResponse("Missing fileName or uploadId", 400);
    }

    // Placeholder: verification/processing pipeline handled server-side (Convex storage)
    console.log(`Confirming image upload for user ${userId}: ${fileName} (${uploadId})`);

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
