import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { stripe } from "@/lib/stripe";
import { requireSession } from "@/app/api/_utils/auth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import {
  checkApiRateLimit,
  logSecurityEvent,
} from "@/lib/utils/securityHeaders";
// Profile type removed as it's not used

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;
    console.info("subscription.cancel.request", { userId, correlationId });

    // Rate limit cancellations: at most 3 attempts / hour / user
    const rl = checkApiRateLimit(
      `subscription_cancel_${userId}`,
      3,
      60 * 60 * 1000
    );
    if (!rl.allowed) {
      logSecurityEvent(
        "RATE_LIMIT_EXCEEDED",
        { endpoint: "subscription/cancel", userId, correlationId },
        request
      );
      return errorResponse("Rate limit exceeded", 429);
    }

    // Fetch user doc
    const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!snap.exists) {
      console.warn("subscription.cancel.profile_not_found", {
        userId,
        correlationId,
      });
      return errorResponse("User profile not found", 404);
    }
    const profile = { id: snap.id, ...(snap.data() as any) };

    if (profile.subscriptionPlan === "free") {
      console.info("subscription.cancel.already_free", {
        userId,
        correlationId,
      });
      return errorResponse("User already has free subscription", 400);
    }

    const stripeSubscriptionId = profile.stripeSubscriptionId as
      | string
      | undefined;
    if (!stripeSubscriptionId) {
      console.warn("subscription.cancel.missing_subscription_id", {
        userId,
        correlationId,
      });
      return errorResponse(
        "No Stripe subscription found for this user. Please contact support.",
        400
      );
    }

    let updatedStripeSub: any = null;
    try {
      // Retrieve current subscription state first (idempotent safety)
      const current = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (current.cancel_at_period_end) {
        console.info("subscription.cancel.already_scheduled", {
          userId,
          stripeSubscriptionId,
          current_period_end: current.current_period_end,
          correlationId,
        });
        // Persist the scheduled state in Firestore to reflect in status endpoint immediately
        try {
          await db
            .collection(COLLECTIONS.USERS)
            .doc(userId)
            .set(
              {
                subscriptionCancelAtPeriodEnd: true,
                subscriptionExpiresAt: current.current_period_end
                  ? current.current_period_end * 1000
                  : profile.subscriptionExpiresAt || null,
                updatedAt: Date.now(),
              },
              { merge: true }
            );
        } catch {}
        return successResponse({
          message: "Cancellation already scheduled at period end.",
          accessUntil: current.current_period_end * 1000,
          plan: profile.subscriptionPlan,
          scheduled: true,
          correlationId,
        });
      }
      updatedStripeSub = await stripe.subscriptions.update(
        stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );
      console.info("subscription.cancel.scheduled", {
        userId,
        stripeSubscriptionId,
        correlationId,
        period_end: updatedStripeSub.current_period_end,
        durationMs: Date.now() - startedAt,
      });
      // Persist the scheduled state in Firestore immediately so the UI reflects it without waiting for webhook
      try {
        await db
          .collection(COLLECTIONS.USERS)
          .doc(userId)
          .set(
            {
              subscriptionCancelAtPeriodEnd: true,
              subscriptionExpiresAt: updatedStripeSub.current_period_end
                ? updatedStripeSub.current_period_end * 1000
                : profile.subscriptionExpiresAt || null,
              updatedAt: Date.now(),
            },
            { merge: true }
          );
      } catch {}
    } catch (stripeError) {
      console.error("subscription.cancel.stripe_error", {
        userId,
        stripeSubscriptionId,
        error:
          stripeError instanceof Error
            ? stripeError.message
            : String(stripeError),
        correlationId,
        durationMs: Date.now() - startedAt,
      });
      return errorResponse(
        "Failed to schedule subscription cancellation. Please try again or contact support.",
        500,
        {
          details:
            stripeError instanceof Error
              ? stripeError.message
              : String(stripeError),
          correlationId,
        }
      );
    }

    const accessUntil =
      (updatedStripeSub?.current_period_end ||
        profile.subscriptionExpiresAt ||
        0) * 1000;
    const response = successResponse({
      message:
        "Your subscription will end at the conclusion of the current billing period.",
      plan: profile.subscriptionPlan,
      accessUntil,
      scheduled: true,
      correlationId,
    });
    return response;
  } catch (error) {
    console.error("subscription.cancel.unhandled_error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      correlationId,
    });
    return errorResponse("Failed to cancel subscription", 500, {
      details: error instanceof Error ? error.message : String(error),
      correlationId,
    });
  }
}
