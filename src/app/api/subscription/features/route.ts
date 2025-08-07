import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSessionFromRequest } from "@/app/api/_utils/authSession";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { getSubscriptionFeatures } from "@/lib/utils/subscriptionUtils";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session.ok) return session.errorResponse!;
    const { userId } = session;
    if (!userId) return errorResponse("User ID not found in session", 401);

    const profile = await convexQueryWithAuth(
      request,
      api.profiles.getProfileByUserId,
      { userId: userId as Id<"users"> }
    );
    if (!profile) return errorResponse("User profile not found", 404);

    const plan = profile.subscriptionPlan || "free";
    const features = getSubscriptionFeatures(plan);

    // Add additional features for mobile compatibility
    const enhancedFeatures = {
      ...features,
      canUseIncognitoMode: plan === "premiumPlus",
      canAccessPrioritySupport: plan === "premium" || plan === "premiumPlus",
      canSeeReadReceipts: plan === "premium" || plan === "premiumPlus",
    };

    return successResponse({
      plan,
      features: enhancedFeatures,
      isActive: profile.subscriptionExpiresAt ? profile.subscriptionExpiresAt > Date.now() : false,
    });
  } catch (error) {
    console.error("Error fetching subscription features:", error);
    return errorResponse("Failed to fetch subscription features", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}