import {
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { getStripePlanMapping, debugStripePlanContext } from "@/lib/subscription/stripePlanMapping";

// Dev-only diagnostics for Stripe configuration (non-secret)
export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    if (process.env.NODE_ENV !== "development") {
      return errorResponse("Not found", 404, { correlationId: ctx.correlationId });
    }
    
    const url = new URL(ctx.request.url);
    const tokenParam = url.searchParams.get("token");
    const requiredToken = process.env.DIAGNOSTICS_TOKEN;
    
    if (requiredToken && tokenParam !== requiredToken) {
      return errorResponse("Forbidden", 403, { correlationId: ctx.correlationId });
    }
    
    const mapping = getStripePlanMapping();
    const context = debugStripePlanContext();
    
    return successResponse({
      mapping,
      context,
      premiumConfigured: !!mapping.premium,
      premiumPlusConfigured: !!mapping.premiumPlus,
      env: {
        hasSecret: Boolean(process.env.STRIPE_SECRET_KEY),
        hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      },
    }, 200, ctx.correlationId);
  },
  {
    requireAuth: false,
    rateLimit: { identifier: "stripe_diagnostics", maxRequests: 10 }
  }
);
