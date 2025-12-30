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

export const DAILY_FEATURES = new Set([
  "profile_view",
  "search_performed",
  "voice_message_sent",
]);

export function isDailyFeature(feature: string): boolean {
  return DAILY_FEATURES.has(feature);
}

export async function getMonthlyUsageMap(userId: string, currentMonth: string) {
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

export async function getDailyUsageMap(userId: string) {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const snap = await db
    .collection(COL_USAGE_EVENTS)
    .where("userId", "==", userId)
    .where("timestamp", ">=", since)
    .get();
  const daily: Record<string, number> = {};
  snap.docs.forEach((d: any) => {
    const data = d.data() as any;
    if (!data?.feature || !isDailyFeature(data.feature)) return;
    daily[data.feature] = (daily[data.feature] || 0) + 1;
  });
  return daily;
}

export function nextMonthResetDateMs() {
  const now = new Date();
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  );
  return nextMonth.getTime();
}

export async function buildUsageSnapshot(userId: string, plan: string) {
  const limits = getPlanLimits(plan);
  const month = monthKey();

  const settled = await Promise.allSettled([
    getMonthlyUsageMap(userId, month),
    getDailyUsageMap(userId),
  ]);

  const monthlyUsage =
    settled[0].status === "fulfilled" ? settled[0].value : ({} as Record<string, number>);
  const dailyUsage =
    settled[1].status === "fulfilled" ? settled[1].value : ({} as Record<string, number>);

  if (settled[0].status === "rejected") {
    console.warn("buildUsageSnapshot: monthly usage failed", settled[0].reason);
  }
  if (settled[1].status === "rejected") {
    console.warn("buildUsageSnapshot: daily usage failed", settled[1].reason);
  }

  const usage = SUBSCRIPTION_FEATURES.map((feature) => {
    const daily = isDailyFeature(feature);
    const used = daily ? dailyUsage[feature] || 0 : monthlyUsage[feature] || 0;
    const rem = featureRemaining(plan as any, feature as any, used);

    return {
      feature,
      used,
      limit: rem.limit,
      unlimited: rem.unlimited,
      remaining: rem.remaining,
      percentageUsed:
        rem.unlimited || rem.limit <= 0
          ? 0
          : Math.min(100, Math.round((used / rem.limit) * 100)),
      isDailyLimit: daily,
    };
  });

  return {
    plan,
    limits,
    month,
    monthlyUsage,
    dailyUsage,
    usage,
    resetDate: nextMonthResetDateMs(),
  };
}
