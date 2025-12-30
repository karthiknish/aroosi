import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { stripe } from "@/lib/stripe";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { SUBSCRIPTION_PLANS } from "../../../../constants";
import { stripeCheckoutSchema } from "@/lib/validation/apiSchemas/stripeCheckout";
import {
  getStripePlanMapping,
  normaliseInternalPlan,
  debugStripePlanContext,
} from "@/lib/subscription/stripePlanMapping";

const ALLOWED_PLAN_IDS = {
  premium: Boolean(SUBSCRIPTION_PLANS?.PREMIUM),
  premiumPlus: Boolean(SUBSCRIPTION_PLANS?.PREMIUM_PLUS),
} as const;

type PublicPlanId = keyof typeof ALLOWED_PLAN_IDS;

function isValidPlanId(planId: unknown): planId is PublicPlanId {
  return typeof planId === "string" && planId in ALLOWED_PLAN_IDS && ALLOWED_PLAN_IDS[planId as PublicPlanId] === true;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_BASE_URL,
    process.env.VERCEL_URL && !process.env.VERCEL_URL.startsWith("http") ? `https://${process.env.VERCEL_URL}` : process.env.VERCEL_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]
    .filter(Boolean)
    .map((u) => { try { return new URL(u as string).origin; } catch { return null; } })
    .filter(Boolean) as string[]
);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try { return ALLOWED_ORIGINS.has(new URL(origin).origin); } catch { return false; }
}

function deriveBaseUrl(originHeader: string | null): string {
  const primary = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (primary) { try { return new URL(primary).origin; } catch {} }
  if (originHeader && isAllowedOrigin(originHeader)) return new URL(originHeader).origin;
  return "http://localhost:3000";
}

const ALLOWED_REDIRECT_PATH_PREFIXES = ["/plans", "/billing"];

function sanitizeClientReturnUrl(candidate: string | undefined | null, baseOrigin: string): string | null {
  if (!candidate) return null;
  try {
    const url = new URL(candidate, baseOrigin);
    if (url.origin !== baseOrigin) return null;
    if (!/^https?:$/.test(url.protocol)) return null;
    if (!ALLOWED_REDIRECT_PATH_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) return null;
    return url.toString();
  } catch { return null; }
}

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof stripeCheckoutSchema>
  ) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const userEmail = (ctx.user as any).email;

    const planId = (body.planId || body.planType) as PublicPlanId | undefined;
    if (!planId || !isValidPlanId(planId)) {
      return errorResponse("Invalid or missing planId", 400, { correlationId: ctx.correlationId });
    }

    const mapping = getStripePlanMapping();
    const priceId = planId === "premium" ? mapping.premium : mapping.premiumPlus;
    if (!priceId) {
      console.error("Missing Stripe price ID for plan", planId);
      return errorResponse("Payment service configuration error", 503, { correlationId: ctx.correlationId });
    }

    if (!stripe) {
      console.error("Stripe not configured");
      return errorResponse("Payment service temporarily unavailable", 503, { correlationId: ctx.correlationId });
    }

    try {
      // Fetch user profile
      const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      const userDoc = snap.exists ? { id: snap.id, ...(snap.data() as any) } : null;
      if (!userDoc?.email) {
        return errorResponse("User account missing email", 400, { correlationId: ctx.correlationId });
      }

      // Check for existing active subscription
      const existingPlan = normaliseInternalPlan(userDoc.subscriptionPlan as any);
      const now = nowTimestamp();
      const firestoreActive = existingPlan && (typeof userDoc.subscriptionExpiresAt === "number" ? userDoc.subscriptionExpiresAt > now : true);
      
      if (firestoreActive && userDoc.stripeSubscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(userDoc.stripeSubscriptionId);
          if (sub && ["active", "trialing"].includes(sub.status)) {
            return errorResponse(`Already subscribed on plan: ${existingPlan}. Manage it via the billing portal.`, 409, { correlationId: ctx.correlationId });
          }
        } catch {}
      }

      const originHeader = ctx.request.headers.get("origin");
      const refererHeader = ctx.request.headers.get("referer");
      const candidateOrigin = originHeader || (refererHeader ? (() => { try { return new URL(refererHeader).origin; } catch { return null; } })() : null);
      
      if (!isAllowedOrigin(candidateOrigin)) {
        return errorResponse("Origin not allowed", 403, { correlationId: ctx.correlationId });
      }

      const baseOrigin = deriveBaseUrl(originHeader || refererHeader || null);
      const successUrlOverride = sanitizeClientReturnUrl(body.successUrl, baseOrigin);
      const cancelUrlOverride = sanitizeClientReturnUrl(body.cancelUrl, baseOrigin);
      const customerEmail = userDoc.email && isValidEmail(userDoc.email) ? userDoc.email : undefined;

      const stripeSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        ...(userDoc.stripeCustomerId ? { customer: userDoc.stripeCustomerId } : { customer_email: customerEmail }),
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { planId, email: userDoc.email, userId },
        success_url: successUrlOverride || `${baseOrigin}/plans?checkout=success`,
        cancel_url: cancelUrlOverride || `${baseOrigin}/plans?checkout=cancel`,
        billing_address_collection: "required",
        subscription_data: { metadata: { planId, email: userDoc.email, userId } },
      });

      if (!stripeSession?.url) {
        console.error("stripe.checkout.failed_to_create", { userId, planId });
        return errorResponse("Failed to create checkout session", 500, { correlationId: ctx.correlationId });
      }

      return successResponse({ url: stripeSession.url, sessionId: stripeSession.id }, 200, ctx.correlationId);
    } catch (error) {
      console.error("stripe.checkout.error", { error, correlationId: ctx.correlationId });
      if (error instanceof Error && error.message.includes("Unauthenticated")) {
        return errorResponse("Authentication failed", 401, { correlationId: ctx.correlationId });
      }
      return errorResponse("Payment service error", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: stripeCheckoutSchema,
    rateLimit: { identifier: "stripe_checkout", maxRequests: 10 }
  }
);
