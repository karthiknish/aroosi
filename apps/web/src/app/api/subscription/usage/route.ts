import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import {
  COL_USAGE_EVENTS,
  COL_USAGE_MONTHLY,
  monthKey,
} from "@/lib/firestoreSchema";
import {
  SUBSCRIPTION_FEATURES,
  getPlanLimits,
  featureRemaining,
} from "@/lib/subscription/planLimits";

async function getProfile(userId: string) {
  const p = await db.collection("users").doc(userId).get();
  return p.exists ? (p.data() as any) : null;
}

async function getMonthlyUsageMap(userId: string, currentMonth: string) {
  const snap = await db
    .collection(COL_USAGE_MONTHLY)
    .where("userId", "==", userId)
    .where("month", "==", currentMonth)
    .get();
  const map: Record<string, number> = {};
  snap.docs.forEach((d: any) => {
    const data = d.data() as any;
    map[data.feature] = data.count;
  });
  return map;
}

async function getDailyUsage(userId: string) {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const snap = await db
    .collection(COL_USAGE_EVENTS)
    .where("userId", "==", userId)
    .where("timestamp", ">=", since)
    .get();
  const daily: Record<string, number> = {};
  snap.docs.forEach((d: any) => {
    const data = d.data() as any;
    if (data.feature === "profile_view" || data.feature === "search_performed") {
      daily[data.feature] = (daily[data.feature] || 0) + 1;
    }
  });
  return daily;
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
      const limits = getPlanLimits(plan);
      const month = monthKey();
      const monthlyMap = await getMonthlyUsageMap(userId, month);
      const dailyMap = await getDailyUsage(userId);
      
      const usageList = SUBSCRIPTION_FEATURES.map((f) => {
        const isDaily = f === "profile_view" || f === "search_performed";
        const used = isDaily ? dailyMap[f] || 0 : monthlyMap[f] || 0;
        const rem = featureRemaining(plan, f as any, used);
        return {
          feature: f,
          used,
          limit: rem.limit,
          unlimited: rem.unlimited,
          remaining: rem.remaining,
          percentageUsed: rem.unlimited || rem.limit <= 0
            ? 0
            : Math.min(100, Math.round((used / rem.limit) * 100)),
        };
      });
      
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
        resetDate: (() => {
          const now = new Date();
          const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
          return nextMonth.getTime();
        })(),
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
