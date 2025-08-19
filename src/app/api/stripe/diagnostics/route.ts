import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getStripePlanMapping, debugStripePlanContext } from "@/lib/subscription/stripePlanMapping";

// Dev-only diagnostics for Stripe configuration (non-secret)
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return errorResponse("Not found", 404);
  }
  // Optional guard: require ?token=dev if an env DIAGNOSTICS_TOKEN is set
  const url = new URL(req.url);
  const tokenParam = url.searchParams.get("token");
  const requiredToken = process.env.DIAGNOSTICS_TOKEN;
  if (requiredToken && tokenParam !== requiredToken) {
    return errorResponse("Forbidden", 403);
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
  });
}
