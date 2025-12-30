import { NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { normalisePlan, getPlanLimits } from "@/lib/subscription/planLimits";
import {
  COL_USAGE_EVENTS,
  COL_USAGE_MONTHLY,
  buildUsageEvent,
  buildUsageMonthly,
  usageMonthlyId,
} from "@/lib/firestoreSchema";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext,
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";

export const POST = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  const { user, correlationId } = ctx;
  
  try {
    const userRef = db.collection("users").doc(user.id);
    const snap = await userRef.get();
    
    if (!snap.exists) {
      return errorResponse("User not found", 404, { correlationId });
    }
    
    const profile = snap.data() as any;
    const now = nowTimestamp();
    const plan = normalisePlan(profile.subscriptionPlan);
    const expiresAt: number | undefined = profile.subscriptionExpiresAt;
    
    if (
      plan !== "premiumPlus" ||
      (typeof expiresAt === "number" && expiresAt <= now)
    ) {
      return errorResponse("Upgrade to Premium Plus to boost your profile", 402, {
        correlationId,
        code: "REQUIRES_PREMIUM_PLUS",
      });
    }
    
    const boostedUntil: number | undefined = profile.boostedUntil;
    if (typeof boostedUntil === "number" && boostedUntil > now) {
      const remainingMs = boostedUntil - now;
      return successResponse({
        code: "ALREADY_BOOSTED",
        boostedUntil,
        boostsRemaining: profile.boostsRemaining ?? 0,
        boostExpiresInSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
        boostDurationHours: 24,
        message: "Your profile is already boosted",
      }, 200, correlationId);
    }
    
    // Determine monthly quota: use plan limits for profile_boost_used (if -1 => unlimited)
    const limits = getPlanLimits(plan);
    const planLimit = limits.profile_boost_used ?? 0;
    const unlimited = planLimit === -1;
    const monthlyQuota = unlimited
      ? Number.MAX_SAFE_INTEGER
      : Math.max(planLimit, 0) || 0;
    const currentMonthKey =
      new Date(now).getUTCFullYear() * 100 + (new Date(now).getUTCMonth() + 1);
    let boostsMonth = profile.boostsMonth as number | undefined;
    let boostsRemaining = profile.boostsRemaining as number | undefined;
    
    if (boostsMonth !== currentMonthKey) {
      boostsMonth = currentMonthKey;
      boostsRemaining = monthlyQuota;
    }
    
    if (!unlimited && (boostsRemaining ?? 0) <= 0) {
      return errorResponse("No boosts remaining this month", 429, {
        correlationId,
        code: "NO_BOOSTS_LEFT",
        details: { boostsRemaining: boostsRemaining ?? 0 },
      });
    }
    
    const BOOST_DURATION_MS = 24 * 60 * 60 * 1000; // 24h
    const newBoostedUntil = now + BOOST_DURATION_MS;
    const newRemaining = unlimited
      ? boostsRemaining
      : Math.max((boostsRemaining ?? monthlyQuota) - 1, 0);
      
    await userRef.set(
      {
        boostedUntil: newBoostedUntil,
        boostsRemaining: newRemaining,
        boostsMonth: currentMonthKey,
        updatedAt: now,
      },
      { merge: true }
    );

    // Usage tracking document writes (monthly aggregate + event) for profile_boost_used
    try {
      if (!unlimited) {
        const event = buildUsageEvent(user.id, "profile_boost_used", {
          correlationId,
          source: "profile.boost",
        });
        const batch = db.batch();
        const eventRef = db.collection(COL_USAGE_EVENTS).doc();
        batch.set(eventRef, event);
        const monthlyRef = db
          .collection(COL_USAGE_MONTHLY)
          .doc(usageMonthlyId(user.id, "profile_boost_used", event.month));
        const monthlySnap = await monthlyRef.get();
        if (monthlySnap.exists) {
          const data = monthlySnap.data() as any;
          batch.update(monthlyRef, {
            count: (data.count || 0) + 1,
            updatedAt: nowTimestamp(),
          });
        } else {
          batch.set(
            monthlyRef,
            buildUsageMonthly(user.id, "profile_boost_used", event.month, 1)
          );
        }
        await batch.commit();
      }
    } catch (usageErr) {
      console.warn("[profile.boost] usage tracking failed", {
        correlationId,
        error: usageErr instanceof Error ? usageErr.message : String(usageErr),
      });
    }
    
    return successResponse({
      code: "BOOST_APPLIED",
      boostedUntil: newBoostedUntil,
      boostsRemaining: newRemaining,
      boostExpiresInSeconds: Math.floor(BOOST_DURATION_MS / 1000),
      boostDurationHours: 24,
      message: "Profile boosted for 24 hours",
      unlimited,
    }, 200, correlationId);
  } catch (err: any) {
    console.error("[profile.boost] fatal error", {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err?.message || "Boost failed", 400, { correlationId });
  }
}, {
  rateLimit: { identifier: "profile_boost", maxRequests: 5 }
});

