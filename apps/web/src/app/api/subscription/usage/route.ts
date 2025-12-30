import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { buildUsageSnapshot } from "@/lib/subscription/usageSnapshot";

async function getProfile(userId: string) {
  const p = await db.collection("users").doc(userId).get();
  return p.exists ? (p.data() as any) : null;
}

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;

    try {
      const profile = await getProfile(userId);
      if (!profile) {
        return errorResponse("Profile not found", 404, { correlationId: ctx.correlationId });
      }
      
      const plan = profile.subscriptionPlan || "free";

      const snapshot = await buildUsageSnapshot(userId, plan);
      const usageList = snapshot.usage;
      
      const usage = {
        plan,
        features: usageList.map((i) => ({
          name: i.feature,
          used: i.used,
          limit: i.limit,
          unlimited: i.unlimited,
          remaining: i.remaining,
          percentageUsed: i.percentageUsed,
        })),
        resetDate: snapshot.resetDate,
        messaging: {
          sent: usageList.find((u) => u.feature === "message_sent")?.used || 0,
          limit: usageList.find((u) => u.feature === "message_sent")?.limit || 0,
        },
        profileViews: {
          count: usageList.find((u) => u.feature === "profile_view")?.used || 0,
          limit: usageList.find((u) => u.feature === "profile_view")?.limit || 0,
        },
        searches: {
          count: usageList.find((u) => u.feature === "search_performed")?.used || 0,
          limit: usageList.find((u) => u.feature === "search_performed")?.limit || 0,
        },
        boosts: {
          used: usageList.find((u) => u.feature === "profile_boost_used")?.used || 0,
          monthlyLimit: usageList.find((u) => u.feature === "profile_boost_used")?.limit || 0,
        },

        // Backwards-compatible fields for clients still expecting the legacy shape.
        usage: snapshot.usage,
        monthlyUsage: snapshot.monthlyUsage,
        dailyUsage: snapshot.dailyUsage,
        limits: snapshot.limits,
      };
      
      return successResponse(usage, 200, ctx.correlationId);
    } catch (error) {
      console.error("subscription/usage error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch usage statistics", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "subscription_usage", maxRequests: 60 }
  }
);
