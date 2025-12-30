import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { stripe } from "@/lib/stripe";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { validateSameOriginUrl } from "@/lib/validation/common";
import { stripePortalSchema } from "@/lib/validation/apiSchemas/stripePortal";

const PORTAL_ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_BASE_URL,
    process.env.VERCEL_URL && !process.env.VERCEL_URL.startsWith("http") ? `https://${process.env.VERCEL_URL}` : process.env.VERCEL_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://localhost:3000",
    "https://aroosi.app",
    "https://www.aroosi.app",
  ]
    .filter(Boolean)
    .map((u) => { try { return new URL(u as string).origin; } catch { return null; } })
    .filter(Boolean) as string[]
);

function isAllowedOrigin(origin: string | null): boolean {
  if (process.env.NODE_ENV === "development") {
    if (!origin) return true;
    try {
      const url = new URL(origin);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    } catch {}
  }
  if (!origin) return false;
  try { return PORTAL_ALLOWED_ORIGINS.has(new URL(origin).origin); } catch { return false; }
}

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof stripePortalSchema>
  ) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const staticPortalUrl = process.env.STRIPE_BILLING_PORTAL;

    const originHeader = ctx.request.headers.get("origin");
    const refererHeader = ctx.request.headers.get("referer");
    const candidateOrigin = originHeader || (refererHeader ? (() => { try { return new URL(refererHeader).origin; } catch { return null; } })() : null);

    if (!isAllowedOrigin(candidateOrigin)) {
      return errorResponse("Origin not allowed", 403, { correlationId: ctx.correlationId });
    }

    if (!stripe && !staticPortalUrl) {
      console.error("Billing portal not configured");
      return errorResponse("Billing portal not configured", 400, { correlationId: ctx.correlationId });
    }

    try {
      const baseUrl: string = process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL?.startsWith("http") ? process.env.VERCEL_URL : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.aroosi.app");

      const requestedReturnUrl = body?.returnUrl;
      const defaultReturn = process.env.STRIPE_BILLING_PORTAL_RETURN_URL || `${baseUrl}/plans`;
      const cleanedReturnDefault = validateSameOriginUrl(defaultReturn, baseUrl) || `${baseUrl}/plans`;
      
      const ALLOWED_RETURN_PATH_PREFIXES = ["/plans", "/billing"];
      const cleanedReturnOverride = (() => {
        if (typeof requestedReturnUrl !== "string") return undefined;
        const validated = validateSameOriginUrl(requestedReturnUrl, baseUrl);
        if (!validated) return undefined;
        try {
          const u = new URL(validated);
          if (!ALLOWED_RETURN_PATH_PREFIXES.some((p) => u.pathname === p || u.pathname.startsWith(p + "/"))) return undefined;
          return u.toString();
        } catch { return undefined; }
      })();

      const cleanedReturn = cleanedReturnOverride || cleanedReturnDefault;

      // Fetch Stripe info from Firestore
      let customerId: string | null = null;
      let subscriptionId: string | null = null;

      const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      if (snap.exists) {
        const data = snap.data() as any;
        customerId = data?.stripeCustomerId || data?.billing?.customerId || data?.stripe?.customerId || null;
        subscriptionId = data?.stripeSubscriptionId || null;
      }

      // Hydrate missing customerId via subscription
      if (!customerId && subscriptionId && stripe) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          if (sub && typeof sub.customer === "string") {
            customerId = sub.customer;
            await db.collection(COLLECTIONS.USERS).doc(userId).set({ stripeCustomerId: customerId, updatedAt: Date.now() }, { merge: true });
          }
        } catch {}
      }

      if ((!customerId || typeof customerId !== "string") && !staticPortalUrl) {
        return errorResponse("No billing portal available. Purchase a plan first.", 400, { correlationId: ctx.correlationId });
      }

      // Validate subscription status
      if (subscriptionId && stripe) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          if (sub && !["active", "trialing", "past_due"].includes(sub.status)) {
            return errorResponse(`Subscription not active (status: ${sub.status}).`, 409, { correlationId: ctx.correlationId });
          }
        } catch {}
      }

      // Static portal URL
      if (staticPortalUrl) {
        if (!/^https:\/\/billing\.stripe\.com\//.test(staticPortalUrl)) {
          console.error("Configured STRIPE_BILLING_PORTAL does not look like a Stripe billing domain");
          return errorResponse("Billing portal misconfigured", 500, { correlationId: ctx.correlationId });
        }
        return successResponse({ url: staticPortalUrl }, 200, ctx.correlationId);
      }

      // Create dynamic session
      const portalSession = await stripe!.billingPortal.sessions.create({
        customer: customerId as string,
        return_url: cleanedReturn,
      });

      if (!portalSession?.url) {
        console.error("Failed to create Stripe billing portal session");
        return errorResponse("Failed to create billing portal session", 500, { correlationId: ctx.correlationId });
      }

      return successResponse({ url: portalSession.url }, 200, ctx.correlationId);
    } catch (error: any) {
      console.error("stripe.portal.error", { error, correlationId: ctx.correlationId });
      const code = error?.code || error?.type;
      if (code === "resource_missing") {
        return errorResponse("Billing portal unavailable (customer not found).", 404, { correlationId: ctx.correlationId });
      }
      if (code === "rate_limit") {
        return errorResponse("Billing service busy, please try again shortly.", 503, { correlationId: ctx.correlationId });
      }
      return errorResponse("Failed to create billing portal session", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: stripePortalSchema,
    rateLimit: { identifier: "stripe_portal", maxRequests: 20 }
  }
);