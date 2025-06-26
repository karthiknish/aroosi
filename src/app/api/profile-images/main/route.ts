import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function PUT(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (!profile) return errorResponse("Profile not found", 404);
    const { imageId } = await request.json();
    if (!imageId) return errorResponse("Missing imageId", 400);
    const profileImages = profile.profileImageIds || [];
    if (!profileImages.includes(imageId)) {
      return errorResponse("Image not found in user's profile", 404);
    }
    const updatedImageOrder = [
      imageId,
      ...profileImages.filter((id: string) => id !== imageId),
    ];
    await convex.mutation(api.users.updateProfile, {
      updates: {
        profileImageIds: updatedImageOrder,
        updatedAt: Date.now(),
      },
    });
    return successResponse({
      message: "Main profile image updated successfully",
      mainImageId: imageId,
      imageOrder: updatedImageOrder,
    });
  } catch (error) {
    console.error("Error setting main profile image:", error);
    return errorResponse("Failed to set main profile image", 500);
  }
}
