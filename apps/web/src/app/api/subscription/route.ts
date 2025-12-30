import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext,
} from "@/lib/api/handler";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { normalisePlan } from "@/lib/subscription/planLimits";
import { getPlanCatalog, planIdToTier, type AppPlanId } from "@/lib/subscription/catalog";
import type { Subscription } from "@aroosi/shared/types";

function toMillis(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (v && typeof v === "object") {
    const anyV = v as any;
    if (typeof anyV.toMillis === "function") return anyV.toMillis();
    if (typeof anyV.seconds === "number") return anyV.seconds * 1000;
  }
  return null;
}

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;

    try {
      const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      if (!snap.exists) {
        return errorResponse("User profile not found", 404, { correlationId: ctx.correlationId });
      }

      const profile = snap.data() as any;
      const rawPlan = (profile.subscriptionPlan ?? "free") as string;
      const plan = normalisePlan(rawPlan) as AppPlanId;
      const expiresAt = toMillis(profile.subscriptionExpiresAt);
      const now = Date.now();

      const isActive = Boolean(expiresAt && expiresAt > now);
      const cancelAtPeriodEnd = Boolean(profile.subscriptionCancelAtPeriodEnd);

      const status: Subscription["status"] = isActive
        ? (cancelAtPeriodEnd ? "cancelled" : "active")
        : "expired";

      const planCatalog = getPlanCatalog();
      const planInfo = planCatalog.find((p) => p.id === plan) || planCatalog[0];

      const startDate = (() => {
        const candidates = [
          profile.subscriptionStartedAt,
          profile.subscriptionStartAt,
          profile.subscriptionPurchasedAt,
          profile.createdAt,
          profile.updatedAt,
        ];
        const ms = candidates.map(toMillis).find((x) => typeof x === "number" && x > 0);
        return new Date(ms || now).toISOString();
      })();

      const sub: Subscription = {
        id: userId,
        tier: planIdToTier(plan),
        status,
        features: planInfo.features,
        startDate,
        endDate: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        autoRenew: isActive && !cancelAtPeriodEnd,
      };

      return successResponse(sub, 200, ctx.correlationId);
    } catch (error) {
      console.error("subscription/route GET error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch subscription", 500, { correlationId: ctx.correlationId });
    }
  },
  { rateLimit: { identifier: "subscription_get", maxRequests: 60 } }
);
