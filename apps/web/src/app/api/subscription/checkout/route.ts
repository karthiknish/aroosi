import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext,
} from "@/lib/api/handler";
import { getPlanCatalog, type AppPlanId, type BillingInterval } from "@/lib/subscription/catalog";

// Mobile currently calls this as a placeholder for IAP.
// For web/Stripe, use /api/stripe/checkout.
export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: any) => {
    const planId = body?.planId as AppPlanId | undefined;
    const interval = body?.interval as BillingInterval | undefined;
    const platform = body?.platform as string | undefined;

    const catalog = getPlanCatalog();
    const exists = Boolean(planId && catalog.some((p) => p.id === planId));
    if (!exists) {
      return errorResponse("Invalid planId", 400, {
        correlationId: ctx.correlationId,
        details: { planId: planId ?? null },
      });
    }

    // We don't currently support initiating App Store / Play Store checkout server-side.
    // Returning a successful placeholder keeps the mobile UI flow unblocked.
    if (platform === "ios" || platform === "android") {
      return successResponse(
        {
          sessionId: "iap",
          url: undefined,
          planId,
          interval: interval || "monthly",
          platform,
        },
        200,
        ctx.correlationId
      );
    }

    return errorResponse(
      "Use /api/stripe/checkout for web purchases",
      400,
      { correlationId: ctx.correlationId, details: { platform: platform ?? null } }
    );
  },
  { rateLimit: { identifier: "subscription_checkout", maxRequests: 15 } }
);
