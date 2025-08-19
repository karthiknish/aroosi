import { NextRequest } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/stripe";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { inferPlanFromSubscription } from "@/lib/subscription/stripePlanMapping";

/**
 * Manual subscription refresh endpoint.
 * Fetches the latest Stripe subscription (if stripeSubscriptionId present) and updates Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userSnap.exists) return errorResponse("User not found", 404);
    const user = userSnap.data() as any;

    const stripeSubscriptionId: string | undefined = user.stripeSubscriptionId;
    if (!stripeSubscriptionId) {
      return successResponse({
        message: "No subscription to refresh (user on free tier)",
        plan: user.subscriptionPlan || "free",
      });
    }
    if (!stripe) return errorResponse("Billing unavailable", 503);

    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      // Infer planId using centralized helper (metadata > price id/nickname)
      const planId = inferPlanFromSubscription(sub) || "free";
      await userSnap.ref.set(
        {
          subscriptionPlan: planId,
          subscriptionExpiresAt: sub.current_period_end * 1000,
          stripeCustomerId:
            typeof sub.customer === "string" ? sub.customer : undefined,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      return successResponse({
        message: "Subscription refreshed",
        plan: planId,
        expiresAt: sub.current_period_end * 1000,
      });
    } catch (e) {
      return errorResponse("Failed to refresh subscription", 500);
    }
  } catch (e) {
    return errorResponse("Subscription refresh error", 500);
  }
}
