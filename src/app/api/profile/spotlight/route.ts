import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { normalisePlan, getPlanLimits } from "@/lib/subscription/planLimits";
import {
  COL_USAGE_EVENTS,
  COL_USAGE_MONTHLY,
  buildUsageEvent,
  buildUsageMonthly,
  usageMonthlyId,
} from "@/lib/firestoreSchema";

// Activate (or renew) a spotlight badge for Premium Plus users.
// If plan limit spotlight_badge is -1 => unlimited activations (no usage decrement).
// Otherwise treat each activation as one usage in the month (future flexibility).
function json(data: any, init?: { status?: number }) {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST = withFirebaseAuth(async (user, _req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const userRef = db.collection("users").doc(user.id);
    const snap = await userRef.get();
    if (!snap.exists) {
  return json(
        { success: false, error: "User not found", correlationId },
        { status: 404 }
      );
    }
    const profile = snap.data() as any;
    const now = Date.now();
    const plan = normalisePlan(profile.subscriptionPlan);
    const expiresAt: number | undefined = profile.subscriptionExpiresAt;
    if (plan !== "premiumPlus" || (typeof expiresAt === "number" && expiresAt <= now)) {
  return json(
        {
          success: false,
          status: 402,
          code: "REQUIRES_PREMIUM_PLUS",
          message: "Upgrade to Premium Plus to enable spotlight",
          correlationId,
        },
        { status: 402 }
      );
    }
    const limits = getPlanLimits(plan);
    const planLimit = limits.spotlight_badge ?? 0;
    const unlimited = planLimit === -1;
    // Activation grants (or refreshes) a spotlight badge for 30 days
    const spotlightDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    const currentExpiry: number | undefined = profile.spotlightBadgeExpiresAt;
    const active = typeof currentExpiry === "number" && currentExpiry > now;
    if (active) {
  return json(
        {
          success: true,
          code: "ALREADY_ACTIVE",
          spotlightBadgeExpiresAt: currentExpiry,
          hasSpotlightBadge: true,
          unlimited,
          message: "Spotlight already active",
          correlationId,
        },
        { status: 200 }
      );
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
  return json(
      {
        success: true,
        code: "SPOTLIGHT_ACTIVATED",
        hasSpotlightBadge: true,
        spotlightBadgeExpiresAt: newExpiry,
        unlimited,
        message: "Spotlight badge activated",
        correlationId,
      },
      { status: 200 }
    );
  } catch (err: any) {
  return json(
      { success: false, error: err?.message || "Spotlight failed", correlationId },
      { status: 400 }
    );
  }
});
