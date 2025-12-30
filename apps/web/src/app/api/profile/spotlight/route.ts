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

// Activate (or renew) a spotlight badge for Premium Plus users.
// If plan limit spotlight_badge is -1 => unlimited activations (no usage decrement).
// Otherwise treat each activation as one usage in the month (future flexibility).

export const POST = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  const { user, correlationId } = ctx;
  
  try {
    const userRef = db.collection("users").doc(user.id);
    const snap = await userRef.get();
    
    if (!snap.exists) {
      return errorResponse("User not found", 404, { correlationId });
    }
    
    const profile = snap.data() as any;
    const now = Date.now();
    const plan = normalisePlan(profile.subscriptionPlan);
    const expiresAt: number | undefined = profile.subscriptionExpiresAt;
    
    if (plan !== "premiumPlus" || (typeof expiresAt === "number" && expiresAt <= now)) {
      return errorResponse("Upgrade to Premium Plus to enable spotlight", 402, {
        correlationId,
        code: "REQUIRES_PREMIUM_PLUS",
      });
    }
    
    const limits = getPlanLimits(plan);
    const planLimit = limits.spotlight_badge ?? 0;
    const unlimited = planLimit === -1;
    
    // Activation grants (or refreshes) a spotlight badge for 30 days
    const spotlightDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    const currentExpiry: number | undefined = profile.spotlightBadgeExpiresAt;
    const active = typeof currentExpiry === "number" && currentExpiry > now;
    
    if (active) {
      return successResponse({
        code: "ALREADY_ACTIVE",
        spotlightBadgeExpiresAt: currentExpiry,
        hasSpotlightBadge: true,
        unlimited,
        message: "Spotlight already active",
      }, 200, correlationId);
    }
    
    const newExpiry = now + spotlightDurationMs;
    await userRef.set(
      {
        hasSpotlightBadge: true,
        spotlightBadgeExpiresAt: newExpiry,
        updatedAt: now,
      },
      { merge: true }
    );
    
    if (!unlimited) {
      // Track usage event (only if limit finite)
      try {
        const event = buildUsageEvent(user.id, "spotlight_badge", {
          correlationId,
          source: "profile.spotlight",
        });
        const batch = db.batch();
        const eventRef = db.collection(COL_USAGE_EVENTS).doc();
        batch.set(eventRef, event);
        const monthlyRef = db
          .collection(COL_USAGE_MONTHLY)
          .doc(usageMonthlyId(user.id, "spotlight_badge", event.month));
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
            buildUsageMonthly(user.id, "spotlight_badge", event.month, 1)
          );
        }
        await batch.commit();
      } catch (usageErr) {
        console.warn("[profile.spotlight] usage tracking failed", {
          correlationId,
          error: usageErr instanceof Error ? usageErr.message : String(usageErr),
        });
      }
    }
    
    return successResponse({
      code: "SPOTLIGHT_ACTIVATED",
      hasSpotlightBadge: true,
      spotlightBadgeExpiresAt: newExpiry,
      unlimited,
      message: "Spotlight badge activated",
    }, 200, correlationId);
  } catch (err: any) {
    console.error("[profile.spotlight] fatal error", {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err?.message || "Spotlight failed", 400, { correlationId });
  }
}, {
  rateLimit: { identifier: "profile_spotlight", maxRequests: 10 }
});

