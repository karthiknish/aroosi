import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  errorResponsePublic,
  ApiContext
} from "@/lib/api/handler";
import { stripe } from "@/lib/stripe";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;

    try {
      // Fetch user doc
      const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      if (!snap.exists) {
        return errorResponse("User profile not found", 404, { correlationId: ctx.correlationId });
      }
      const profile = { id: snap.id, ...(snap.data() as any) };

      if (profile.subscriptionPlan === "free") {
        return errorResponsePublic("User already has free subscription", 400);
      }

      const stripeSubscriptionId = profile.stripeSubscriptionId as string | undefined;
      if (!stripeSubscriptionId) {
        return errorResponsePublic(
          "No Stripe subscription found for this user. Please contact support.",
          400
        );
      }

      let updatedStripeSub: any = null;
      try {
        // Retrieve current subscription state first
        const current = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (current.cancel_at_period_end) {
          // Already scheduled - persist and return
          try {
            await db.collection(COLLECTIONS.USERS).doc(userId).set(
              {
                subscriptionCancelAtPeriodEnd: true,
                subscriptionExpiresAt: current.current_period_end
                  ? current.current_period_end * 1000
                  : profile.subscriptionExpiresAt || null,
                updatedAt: nowTimestamp(),
              },
              { merge: true }
            );
          } catch {}
          return successResponse({
            message: "Cancellation already scheduled at period end.",
            accessUntil: current.current_period_end * 1000,
            plan: profile.subscriptionPlan,
            scheduled: true,
          }, 200, ctx.correlationId);
        }

        updatedStripeSub = await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        // Persist the scheduled state in Firestore
        try {
          await db.collection(COLLECTIONS.USERS).doc(userId).set(
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
        console.error("subscription/cancel stripe error", {
          error: stripeError,
          correlationId: ctx.correlationId,
        });
        return errorResponse(
          "Failed to schedule subscription cancellation. Please try again or contact support.",
          500,
          { correlationId: ctx.correlationId }
        );
      }

      const accessUntil = (updatedStripeSub?.current_period_end || profile.subscriptionExpiresAt || 0) * 1000;
      return successResponse({
        message: "Your subscription will end at the conclusion of the current billing period.",
        plan: profile.subscriptionPlan,
        accessUntil,
        scheduled: true,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("subscription/cancel error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to cancel subscription", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "subscription_cancel", maxRequests: 3, windowMs: 3600000 }
  }
);
