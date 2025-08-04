import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { getSubscriptionFeatures } from "@/lib/utils/subscriptionUtils";

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in session", 401);

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    // Cookie-only: do not set bearer on client

    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
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