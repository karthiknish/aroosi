import {
  createAuthenticatedHandler,
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { normalisePlan } from "@/lib/subscription/planLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    const { searchParams } = new URL(ctx.request.url);
    const userIdParam = searchParams.get("userId");

    let profile: any = null;
    let userId = userIdParam;

    if (!userId) {
      // If no userId param, require authentication
      if (!ctx.user) {
        return errorResponse("Authentication required", 401, { correlationId: ctx.correlationId });
      }
      userId = (ctx.user as any).userId || (ctx.user as any).id;
    }

    try {
      const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      profile = snap.exists ? { _id: snap.id, ...(snap.data() as any) } : null;
    } catch (e) {
      console.error("subscription/status Firestore error", { error: e, correlationId: ctx.correlationId });
    }

    if (!profile) {
      console.warn("subscription/status profile not found - returning default free plan", {
        correlationId: ctx.correlationId,
      });
      return successResponse({
        plan: "free",
        isActive: false,
        expiresAt: null,
        daysRemaining: 0,
        isTrial: false,
        trialEndsAt: null,
        trialDaysRemaining: 0,
        boostsRemaining: 0,
        hasSpotlightBadge: false,
        spotlightBadgeExpiresAt: null,
        subscriptionPlan: "free",
        subscriptionExpiresAt: null,
      }, 200, ctx.correlationId);
    }

    const p = profile as any;
    const now = Date.now();
    const expiresAt = typeof p.subscriptionExpiresAt === "number" ? p.subscriptionExpiresAt : null;
    const isActive = expiresAt ? expiresAt > now : false;
    const rawPlan = (p.subscriptionPlan ?? "free") || "free";
    const plan = normalisePlan(rawPlan);
    let daysRemaining = 0;
    if (expiresAt && isActive) {
      daysRemaining = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    }

    const trialEndsAt = null as number | null;
    const isTrial = plan === "free" && Boolean(trialEndsAt && trialEndsAt > now);
    const trialDaysRemaining = isTrial && trialEndsAt
      ? Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000))
      : 0;

    return successResponse({
      plan,
      isActive,
      expiresAt,
      daysRemaining,
      cancelAtPeriodEnd: Boolean(p.subscriptionCancelAtPeriodEnd),
      isTrial,
      trialEndsAt,
      trialDaysRemaining,
      boostsRemaining: typeof p.boostsRemaining === "number" ? p.boostsRemaining : 0,
      hasSpotlightBadge: !!p.hasSpotlightBadge,
      spotlightBadgeExpiresAt: typeof p.spotlightBadgeExpiresAt === "number" ? p.spotlightBadgeExpiresAt : null,
      subscriptionPlan: plan,
      subscriptionExpiresAt: expiresAt,
    }, 200, ctx.correlationId);
  },
  {
    requireAuth: false, // Auth optional - can pass userId param
    rateLimit: { identifier: "subscription_status", maxRequests: 60 }
  }
);
