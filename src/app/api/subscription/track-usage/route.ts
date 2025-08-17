import { NextRequest } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";
import { successResponse, errorResponse } from "@/lib/apiResponse";
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

// track-usage now relies on centralized planLimits configuration

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
  snap.docs.forEach(
    (
      d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    ) => {
      const data = d.data() as any;
      map[data.feature] = data.count;
    }
  );
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
  snap.docs.forEach(
    (
      d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    ) => {
      const data = d.data() as any;
      if (
        data.feature === "profile_view" ||
        data.feature === "search_performed"
      )
        daily[data.feature] = (daily[data.feature] || 0) + 1;
    }
  );
  return daily;
}

export async function POST(req: NextRequest) {
  // unify semantics with previous Convex-based endpoint
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (e) {
    const err = e as AuthError;
    return errorResponse(err.message, err.status);
  }
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const { feature, metadata } = body;
  if (!feature || !SUBSCRIPTION_FEATURES.includes(feature))
    return errorResponse(
      `Invalid feature. Must be one of: ${SUBSCRIPTION_FEATURES.join(", ")}`,
      400
    );
  try {
    const profile = await getProfile(auth.userId);
    if (!profile) return errorResponse("Profile not found", 404);
    const plan = normalisePlan(profile.subscriptionPlan || "free");
    const limits = getPlanLimits(plan);
    const limit = limits[feature as SubscriptionFeature];
    // Check limit
    let currentUsage = 0;
    const month = monthKey();
    if (feature === "profile_view" || feature === "search_performed") {
      const dailyMap = await getDailyUsage(auth.userId);
      currentUsage = dailyMap[feature] || 0;
    } else {
      const monthlyMap = await getMonthlyUsageMap(auth.userId, month);
      currentUsage = monthlyMap[feature] || 0;
    }
    if (limit !== -1 && currentUsage >= limit)
      return errorResponse("Feature usage limit reached", 403, {
        limit,
        used: currentUsage,
        remaining: 0,
      });
    // Record event
    const event = buildUsageEvent(auth.userId, feature, metadata);
    const batch = db.batch();
    const eventRef = db.collection(COL_USAGE_EVENTS).doc();
    batch.set(eventRef, event);
    const monthlyId = usageMonthlyId(auth.userId, feature, event.month);
    const monthlyRef = db.collection(COL_USAGE_MONTHLY).doc(monthlyId);
    const monthlySnap = await monthlyRef.get();
    if (monthlySnap.exists) {
      const data = monthlySnap.data() as any;
      batch.update(monthlyRef, {
        count: (data.count || 0) + 1,
        updatedAt: Date.now(),
      });
    } else {
      batch.set(
        monthlyRef,
        buildUsageMonthly(auth.userId, feature, event.month, 1)
      );
    }
    await batch.commit();
    const newUsage = currentUsage + 1;
    const rem = featureRemaining(
      plan,
      feature as SubscriptionFeature,
      newUsage
    );
    return successResponse({
      feature,
      plan,
      tracked: true,
      currentUsage: newUsage,
      limit: rem.limit,
      remainingQuota: rem.remaining,
      isUnlimited: rem.unlimited,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse("Failed to track feature usage", 500, {
      details: msg,
    });
  }
}
