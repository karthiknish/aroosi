import { NextRequest } from "next/server";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/stripe";
import { inferPlanFromSubscription } from "@/lib/subscription/stripePlanMapping";

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

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;

    // Origin check
    const originHeader = ctx.request.headers.get("origin");
    const refererHeader = ctx.request.headers.get("referer");
    const candidateOrigin = originHeader || (refererHeader
      ? (() => { try { return new URL(refererHeader).origin; } catch { return null; } })()
      : null);
    if (!isAllowedOrigin(candidateOrigin)) {
      return errorResponse("Origin not allowed", 403, { correlationId: ctx.correlationId });
    }

    try {
      const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      if (!userSnap.exists) {
        return errorResponse("User not found", 404, { correlationId: ctx.correlationId });
      }
      const user = userSnap.data() as any;

      const stripeSubscriptionId: string | undefined = user.stripeSubscriptionId;
      if (!stripeSubscriptionId) {
        return successResponse({
          message: "No subscription to refresh (user on free tier)",
          plan: user.subscriptionPlan || "free",
        }, 200, ctx.correlationId);
      }
      
      if (!stripe) {
        return errorResponse("Billing unavailable", 503, { correlationId: ctx.correlationId });
      }

      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const planId = inferPlanFromSubscription(sub) || "free";
      
      await userSnap.ref.set(
        {
          subscriptionPlan: planId,
          subscriptionExpiresAt: sub.current_period_end * 1000,
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      
      return successResponse({
        message: "Subscription refreshed",
        plan: planId,
        expiresAt: sub.current_period_end * 1000,
      }, 200, ctx.correlationId);
    } catch (e) {
      console.error("subscription/refresh error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to refresh subscription", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "subscription_refresh", maxRequests: 5 }
  }
);
