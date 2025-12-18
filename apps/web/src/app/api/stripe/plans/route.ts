import crypto from "node:crypto";
import {
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { SUBSCRIPTION_PLANS } from "../../../../constants";

export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    try {
      if (!SUBSCRIPTION_PLANS || !SUBSCRIPTION_PLANS.FREE) {
        return errorResponse("Plans configuration unavailable", 503, { correlationId: ctx.correlationId });
      }

      const normalized = [
        {
          id: "free",
          name: SUBSCRIPTION_PLANS.FREE.name,
          price: Number(SUBSCRIPTION_PLANS.FREE.price) || 0,
          currency: "GBP",
          features: Array.isArray(SUBSCRIPTION_PLANS.FREE.features) ? SUBSCRIPTION_PLANS.FREE.features : [],
          popular: !!SUBSCRIPTION_PLANS.FREE.popular,
        },
        {
          id: "premium",
          name: SUBSCRIPTION_PLANS.PREMIUM.name,
          price: Number(SUBSCRIPTION_PLANS.PREMIUM.price) || 0,
          currency: "GBP",
          features: Array.isArray(SUBSCRIPTION_PLANS.PREMIUM.features) ? SUBSCRIPTION_PLANS.PREMIUM.features : [],
          popular: !!SUBSCRIPTION_PLANS.PREMIUM.popular,
        },
        {
          id: "premiumPlus",
          name: SUBSCRIPTION_PLANS.PREMIUM_PLUS.name,
          price: Number(SUBSCRIPTION_PLANS.PREMIUM_PLUS.price) || 0,
          currency: "GBP",
          features: Array.isArray(SUBSCRIPTION_PLANS.PREMIUM_PLUS.features) ? SUBSCRIPTION_PLANS.PREMIUM_PLUS.features : [],
          popular: !!SUBSCRIPTION_PLANS.PREMIUM_PLUS.popular,
        },
      ];

      // Compute weak ETag based on JSON content
      const body = JSON.stringify(normalized);
      const etag = 'W/"' + crypto.createHash("sha256").update(body).digest("base64").slice(0, 32) + '"';
      
      const res = successResponse(normalized, 200, ctx.correlationId);
      res.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=300");
      res.headers.set("ETag", etag);
      return res;
    } catch (error) {
      console.error("stripe/plans error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to load plans", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    requireAuth: false,
    rateLimit: { identifier: "stripe_plans", maxRequests: 120 }
  }
);