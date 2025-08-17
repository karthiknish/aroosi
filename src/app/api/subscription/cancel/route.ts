import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { stripe } from "@/lib/stripe";
import { requireSession } from "@/app/api/_utils/auth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
// Profile type removed as it's not used

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    // Fetch user doc
    const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!snap.exists) return errorResponse("User profile not found", 404);
    const profile = { id: snap.id, ...(snap.data() as any) };

    if (profile.subscriptionPlan === "free") {
      return errorResponse("User already has free subscription", 400);
    }

    const stripeSubscriptionId = profile.stripeSubscriptionId as
      | string
      | undefined;
    if (!stripeSubscriptionId) {
      return errorResponse(
        "No Stripe subscription found for this user. Please contact support.",
        400
      );
    }

    try {
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    } catch (stripeError) {
      console.error("Stripe cancellation failed:", stripeError);
      return errorResponse(
        "Failed to cancel Stripe subscription. Please try again or contact support.",
        500,
        {
          details:
            stripeError instanceof Error
              ? stripeError.message
              : String(stripeError),
        }
      );
    }

    return successResponse({
      message:
        "Your subscription cancellation is being processed. You will retain premium access until the end of your billing period.",
      plan: profile.subscriptionPlan,
      accessUntil: profile.subscriptionExpiresAt,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return errorResponse("Failed to cancel subscription", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
