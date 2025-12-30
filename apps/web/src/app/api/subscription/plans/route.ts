import {
  createApiHandler,
  successResponse,
  ApiContext,
} from "@/lib/api/handler";
import { getPlanCatalog } from "@/lib/subscription/catalog";

export const dynamic = "force-dynamic";

export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    const plans = getPlanCatalog();
    return successResponse(plans, 200, ctx.correlationId);
  },
  {
    requireAuth: false,
    rateLimit: { identifier: "subscription_plans", maxRequests: 120 },
  }
);
