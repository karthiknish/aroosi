import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { getSubscriptionFeatures } from "@/lib/utils/subscriptionUtils";
import { db } from "@/lib/firebaseAdmin";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const snap = await db.collection("users").doc(userId).get();
      if (!snap.exists) {
        return errorResponse("User profile not found", 404, { correlationId: ctx.correlationId });
      }
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
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("Error fetching subscription features:", {
        error: error instanceof Error ? error.message : String(error),
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to fetch subscription features", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "subscription_features", maxRequests: 30 }
  }
);
