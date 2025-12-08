import { NextRequest } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/stripe";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { inferPlanFromSubscription } from "@/lib/subscription/stripePlanMapping";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

const REFRESH_ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_BASE_URL,
    process.env.VERCEL_URL && !process.env.VERCEL_URL.startsWith("http")
      ? `https://${process.env.VERCEL_URL}`
      : process.env.VERCEL_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]
    .filter(Boolean)
    .map((u) => {
      try {
        return new URL(u as string).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as string[]
);

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  try {
    return REFRESH_ALLOWED_ORIGINS.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

/**
 * Manual subscription refresh endpoint.
 * Fetches the latest Stripe subscription (if stripeSubscriptionId present) and updates Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    const candidateOrigin =
      originHeader ||
      (refererHeader
        ? (() => {
            try {
              return new URL(refererHeader).origin;
            } catch {
              return null;
            }
          })()
        : null);
    if (!isAllowedOrigin(candidateOrigin)) {
      return errorResponse("Origin not allowed", 403);
    }

    const session = await requireSession(req);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    const rl = checkApiRateLimit(`subscription_refresh_${userId}`, 5, 60_000); // max 5 refresh / min
    if (!rl.allowed) return errorResponse("Rate limit exceeded", 429);

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
