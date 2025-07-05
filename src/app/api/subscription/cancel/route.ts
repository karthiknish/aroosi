import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { stripe } from "@/lib/stripe";
import type { Profile } from "@/types/profile";

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);

    if (!userId) {
      return errorResponse("User ID not found in token", 401);
    }
    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (!profile) return errorResponse("User profile not found", 404);

    if (profile.subscriptionPlan === "free") {
      return errorResponse("User already has free subscription", 400);
    }

    const stripeSubscriptionId = (
      profile as Profile & { stripeSubscriptionId?: string }
    ).stripeSubscriptionId;
    if (!stripeSubscriptionId) {
      return errorResponse(
        "No Stripe subscription found for this user. Please contact support.",
        400,
      );
    }

    // Cancel the Stripe subscription
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
        },
      );
    }

    // Do NOT downgrade the plan here; let the webhook handle it
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
