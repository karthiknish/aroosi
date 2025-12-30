import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  errorResponsePublic,
  ApiContext
} from "@/lib/api/handler";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import {
  COL_USAGE_EVENTS,
  COL_USAGE_MONTHLY,
  buildUsageEvent,
  buildUsageMonthly,
  monthKey,
  usageMonthlyId,
} from "@/lib/firestoreSchema";
import {
  SUBSCRIPTION_FEATURES,
  SubscriptionFeature,
  getPlanLimits,
  featureRemaining,
  normalisePlan,
} from "@/lib/subscription/planLimits";
import { subscriptionTrackUsageSchema } from "@/lib/validation/apiSchemas/subscription";

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
  const profileViewTargets = new Set<string>();
  snap.docs.forEach((d: any) => {
    const data = d.data() as any;
    if (data.feature === "search_performed") {
      daily[data.feature] = (daily[data.feature] || 0) + 1;
    } else if (data.feature === "voice_message_sent") {
      daily[data.feature] = (daily[data.feature] || 0) + 1;
    } else if (data.feature === "profile_view") {
      const tgt = data.metadata?.targetUserId || data.metadata?.profileId;
      if (tgt) {
        if (!profileViewTargets.has(tgt)) {
          profileViewTargets.add(tgt);
          daily[data.feature] = (daily[data.feature] || 0) + 1;
        }
      } else {
        daily[data.feature] = (daily[data.feature] || 0) + 1;
      }
    }
  });
  return daily;
}

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof subscriptionTrackUsageSchema>
  ) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { feature, metadata } = body;

    if (!SUBSCRIPTION_FEATURES.includes(feature as any)) {
      return errorResponse(
        `Invalid feature. Must be one of: ${SUBSCRIPTION_FEATURES.join(", ")}`,
        400,
        { correlationId: ctx.correlationId }
      );
    }

    try {
      const profile = await getProfile(userId);
      if (!profile) {
        return errorResponse("Profile not found", 404, { correlationId: ctx.correlationId });
      }
      
      const plan = normalisePlan(profile.subscriptionPlan || "free");
      const limits = getPlanLimits(plan);
      const limit = limits[feature as SubscriptionFeature];
      
      // Check limit
      let currentUsage = 0;
      const month = monthKey();
      if (feature === "profile_view" || feature === "search_performed" || feature === "voice_message_sent") {
        const dailyMap = await getDailyUsage(userId);
        currentUsage = dailyMap[feature] || 0;
      } else {
        const monthlyMap = await getMonthlyUsageMap(userId, month);
        currentUsage = monthlyMap[feature] || 0;
      }
      
      if (limit !== -1 && currentUsage >= limit) {
        return errorResponsePublic("Feature usage limit reached", 403, {
          correlationId: ctx.correlationId,
          details: {
            feature,
            plan,
            limit,
            used: currentUsage,
            remaining: 0,
          },
        });
      }
      
      // Record event
      const event = buildUsageEvent(userId, feature, metadata);
      
      // For profile_view, skip duplicates for same target today
      if (feature === "profile_view") {
        const targetId = metadata?.targetUserId || metadata?.profileId;
        if (targetId) {
          const since = nowTimestamp() - 24 * 60 * 60 * 1000;
          const dupSnap = await db
            .collection(COL_USAGE_EVENTS)
            .where("userId", "==", userId)
            .where("timestamp", ">=", since)
            .get();
          const alreadyViewed = dupSnap.docs.some((d: any) => {
            const dat = d.data() as any;
            return (
              dat.feature === "profile_view" &&
              (dat.metadata?.targetUserId || dat.metadata?.profileId) === targetId
            );
          });
          if (alreadyViewed) {
            const remExisting = featureRemaining(plan, feature as SubscriptionFeature, currentUsage);
            return successResponse({
              feature,
              plan,
              tracked: false,
              duplicate: true,
              currentUsage,
              limit: remExisting.limit,
              remainingQuota: remExisting.remaining,
              isUnlimited: remExisting.unlimited,
            }, 200, ctx.correlationId);
          }
        }
      }
      
      const batch = db.batch();
      const eventRef = db.collection(COL_USAGE_EVENTS).doc();
      batch.set(eventRef, event);
      
      const monthlyId = usageMonthlyId(userId, feature, event.month);
      const monthlyRef = db.collection(COL_USAGE_MONTHLY).doc(monthlyId);
      const monthlySnap = await monthlyRef.get();
      
      if (monthlySnap.exists) {
        const data = monthlySnap.data() as any;
        batch.update(monthlyRef, { count: (data.count || 0) + 1, updatedAt: nowTimestamp() });
      } else {
        batch.set(monthlyRef, buildUsageMonthly(userId, feature, event.month, 1));
      }
      
      await batch.commit();
      
      const newUsage = currentUsage + 1;
      const rem = featureRemaining(plan, feature as SubscriptionFeature, newUsage);
      
      return successResponse({
        feature,
        plan,
        tracked: true,
        currentUsage: newUsage,
        limit: rem.limit,
        remainingQuota: rem.remaining,
        isUnlimited: rem.unlimited,
      }, 200, ctx.correlationId);
    } catch (e) {
      console.error("subscription/track-usage error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to track feature usage", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: subscriptionTrackUsageSchema,
    rateLimit: { identifier: "subscription_track_usage", maxRequests: 100 }
  }
);
