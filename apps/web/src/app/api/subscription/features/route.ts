import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSubscriptionFeatures } from "@/lib/utils/subscriptionUtils";
import { db } from "@/lib/firebaseAdmin";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";

export const GET = withFirebaseAuth(async (user) => {
  try {
    const userId = user.id;

    const snap = await db.collection("users").doc(userId).get();
    if (!snap.exists) return errorResponse("User profile not found", 404);
    const profile = snap.data() as any;

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
    isActive: profile.subscriptionExpiresAt
      ? profile.subscriptionExpiresAt > Date.now()
      : false,
  });
  } catch (error) {
    console.error("Error fetching subscription features:", error);
    return errorResponse("Failed to fetch subscription features", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
