import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { stripe } from "@/lib/stripe";
import { requireSession } from "@/app/api/_utils/auth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
// Profile type removed as it's not used

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;
    console.info("subscription.cancel.request", { userId, correlationId });

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

    try {
      await stripe.subscriptions.cancel(stripeSubscriptionId);
      console.info("subscription.cancel.success", {
        userId,
        stripeSubscriptionId,
        correlationId,
        durationMs: Date.now() - startedAt,
      });
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
        "Failed to cancel Stripe subscription. Please try again or contact support.",
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

    const response = successResponse({
      message:
        "Your subscription cancellation is being processed. You will retain premium access until the end of your billing period.",
      plan: profile.subscriptionPlan,
      accessUntil: profile.subscriptionExpiresAt,
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
