import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import {
  checkApiRateLimit,
  logSecurityEvent,
} from "@/lib/utils/securityHeaders";

import { SUBSCRIPTION_PLANS } from "../../../../constants";
import {
  getStripePlanMapping,
  normaliseInternalPlan,
  debugStripePlanContext,
} from "@/lib/subscription/stripePlanMapping";

/**
 * Server-side canonical mapping of allowed public planIds to server constants.
 * This derives from SUBSCRIPTION_PLANS so the server remains the single source of truth.
 */
const ALLOWED_PLAN_IDS = {
  premium: Boolean(SUBSCRIPTION_PLANS?.PREMIUM),
  premiumPlus: Boolean(SUBSCRIPTION_PLANS?.PREMIUM_PLUS),
} as const;

type PublicPlanId = keyof typeof ALLOWED_PLAN_IDS;

interface RequestBody {
  // New canonical field (expected by this route originally)
  planId?: PublicPlanId;
  // Backwards-compatible alias used by legacy client util
  planType?: PublicPlanId;
  // Optional client-specified redirect overrides (must be validated)
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Validates public-facing planId strictly against server constants.
 */
function isValidPlanId(planId: unknown): planId is PublicPlanId {
  return (
    typeof planId === "string" &&
    planId in ALLOWED_PLAN_IDS &&
    ALLOWED_PLAN_IDS[planId as PublicPlanId] === true
  );
}

export async function POST(req: NextRequest) {
  try {
    // Firebase session (cookie based)
    const session = await requireSession(req);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId, profile } = session;

    // Strict rate limiting for payment operations
    const rateLimitResult = checkApiRateLimit(
      `stripe_checkout_${userId}`,
      10,
      60000
    ); // 10 checkouts per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Parse and validate request body
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object") {
      return errorResponse("Missing or invalid body", 400);
    }
    // Accept legacy planType alias
    const planId = (body.planId || body.planType) as PublicPlanId | undefined;
    if (!planId || !isValidPlanId(planId)) {
      return errorResponse("Invalid or missing planId", 400);
    }

    // Validate Stripe configuration (use centralized mapping helper)
    const mapping = getStripePlanMapping();
    const priceId =
      planId === "premium" ? mapping.premium : mapping.premiumPlus;
    const priceIdSource = priceId
      ? priceId === SUBSCRIPTION_PLANS.PREMIUM?.priceId ||
        priceId === SUBSCRIPTION_PLANS.PREMIUM_PLUS?.priceId
        ? "constants"
        : "env"
      : "none";
    if (!priceId) {
      console.error(
        "Missing Stripe price ID for plan (env + constants empty)",
        planId
      );
      return errorResponse("Payment service configuration error", 503);
    }
    if (!stripe) {
      console.error("Stripe not configured");
      return errorResponse("Payment service temporarily unavailable", 503);
    }

    // Ensure we have fresh Firestore profile (may contain stripeCustomerId)
    let userDoc: any = profile;
    try {
      const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      if (snap.exists) userDoc = { id: snap.id, ...(snap.data() as any) };
    } catch (e) {
      console.warn("Checkout Firestore profile fetch failed", e);
    }
    if (!userDoc?.email || typeof userDoc.email !== "string") {
      return errorResponse("User account missing email", 400);
    }

    // Guard: Prevent creating a new checkout session if user already has an active subscription.
    // We trust Firestore first (fast path) and optionally reconcile with Stripe if we have a subscription id.
    try {
      const existingPlan = normaliseInternalPlan(
        userDoc.subscriptionPlan as any
      );
      const now = Date.now();
      // normaliseInternalPlan returns one of: 'free' | 'premium' | 'premiumPlus'
      // Type narrowing issue: existingPlan typed to exclude 'free' already, so simple truthy check suffices.
      const firestoreActive =
        existingPlan &&
        (typeof userDoc.subscriptionExpiresAt === "number"
          ? userDoc.subscriptionExpiresAt > now
          : true); // if no expiry stored, assume active until proven otherwise
      let stripeActive = false;
      if (firestoreActive && userDoc.stripeSubscriptionId && stripe) {
        try {
          const sub = await stripe.subscriptions.retrieve(
            userDoc.stripeSubscriptionId
          );
          if (sub && ["active", "trialing"].includes(sub.status)) {
            stripeActive = true;
            // Optionally sync expiration if drifted
            const subExpires = sub.current_period_end * 1000;
            if (
              typeof userDoc.subscriptionExpiresAt !== "number" ||
              Math.abs(subExpires - userDoc.subscriptionExpiresAt) > 60 * 1000
            ) {
              try {
                await db.collection(COLLECTIONS.USERS).doc(userId).set(
                  {
                    subscriptionExpiresAt: subExpires,
                    updatedAt: now,
                  },
                  { merge: true }
                );
              } catch (syncErr) {
                console.warn(
                  "Checkout route: failed to sync subscription expiry",
                  syncErr
                );
              }
            }
          }
        } catch (subErr) {
          console.warn(
            "Checkout route: unable to retrieve existing Stripe subscription",
            subErr
          );
        }
      }
      if (firestoreActive || stripeActive) {
        const activePlan = existingPlan || userDoc.subscriptionPlan || "paid";
        return errorResponse(
          `Already subscribed on plan: ${activePlan}. Manage it via the billing portal.`,
          409
        );
      }
    } catch (alreadyErr) {
      console.warn("Checkout route: subscription pre-check failed", alreadyErr);
    }
    // Validate and sanitize base URL
    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    // Basic CSRF defense: require allowed Origin OR (fallback) allowed Referer
    if (
      !isAllowedOrigin(
        originHeader ||
          (refererHeader
            ? (() => {
                try {
                  return new URL(refererHeader).origin;
                } catch {
                  return null;
                }
              })()
            : null)
      )
    ) {
      return errorResponse("Origin not allowed", 403);
    }
    const baseOrigin = deriveBaseUrl(originHeader || refererHeader || null);

    // Allow client-provided success/cancel overrides (validated & restricted)
    const successUrlOverride = sanitizeClientReturnUrl(
      body.successUrl,
      baseOrigin
    );
    const cancelUrlOverride = sanitizeClientReturnUrl(
      body.cancelUrl,
      baseOrigin
    );
    // Validate email if provided
    const customerEmail =
      userDoc.email && isValidEmail(userDoc.email) ? userDoc.email : undefined;
    console.info("stripe.checkout.prepare", {
      userId,
      planId,
      priceId,
      priceIdSource,
      hasStripeCustomerId: !!userDoc.stripeCustomerId,
      email: userDoc.email,
      baseOrigin,
      successUrlOverride: !!successUrlOverride,
      cancelUrlOverride: !!cancelUrlOverride,
      mappingContext: debugStripePlanContext(),
    });
    // Create Stripe checkout session with security considerations
    // Reuse existing customer if known
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      ...(userDoc.stripeCustomerId
        ? { customer: userDoc.stripeCustomerId }
        : { customer_email: customerEmail }),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        planId,
        email: userDoc.email,
        userId, // Add for double verification in webhook
      },
      success_url: successUrlOverride || `${baseOrigin}/plans?checkout=success`,
      cancel_url: cancelUrlOverride || `${baseOrigin}/plans?checkout=cancel`,
      billing_address_collection: "required",
      subscription_data: {
        metadata: {
          planId,
          email: userDoc.email,
          userId,
        },
      },
    });
    if (!stripeSession || !stripeSession.url) {
      console.error("stripe.checkout.failed_to_create", { userId, planId });
      return errorResponse("Failed to create checkout session", 500);
    }
    console.info("stripe.checkout.created", {
      sessionId: stripeSession.id,
      userId,
      planId,
      priceId,
      priceIdSource,
      url: stripeSession.url,
    });

    return successResponse({
      url: stripeSession.url,
      sessionId: stripeSession.id,
    });
  } catch (error) {
    console.error("stripe.checkout.error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    logSecurityEvent(
      "VALIDATION_FAILED",
      {
        endpoint: "stripe/checkout",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      req
    );
    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Authentication failed", 401);
    }
    if (error && typeof error === "object" && "type" in error) {
      const stripeError = error as { type: string; message: string };
      console.error("Stripe error:", stripeError.type, stripeError.message);
      if (stripeError.type === "StripeCardError") {
        return errorResponse("Payment method error", 400);
      }
      if (stripeError.type === "StripeRateLimitError") {
        return errorResponse("Payment service busy, please try again", 503);
      }
    }
    return errorResponse("Payment service error", 500);
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

// Build an allowlist of acceptable origins (scheme+host) from env
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
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

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false; // require explicit origin for CSRF defense (except same-site browsers may omit)
  try {
    const o = new URL(origin).origin;
    return ALLOWED_ORIGINS.has(o);
  } catch {
    return false;
  }
}

function deriveBaseUrl(originHeader: string | null): string {
  // Prefer explicit configured app URL; only fallback to validated origin.
  const primary =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (primary) {
    try {
      return new URL(primary).origin;
    } catch {
      /* ignore */
    }
  }
  if (originHeader && isAllowedOrigin(originHeader))
    return new URL(originHeader).origin;
  return "http://localhost:3000"; // dev fallback
}

// Restrict which relative paths are allowed for success/cancel overrides
const ALLOWED_REDIRECT_PATH_PREFIXES = ["/plans", "/billing"]; // extend as needed

function sanitizeClientReturnUrl(
  candidate: string | undefined | null,
  baseOrigin: string
): string | null {
  if (!candidate) return null;
  try {
    const url = new URL(candidate, baseOrigin); // resolves relative
    if (url.origin !== baseOrigin) return null; // enforce same-origin
    if (!/^https?:$/.test(url.protocol)) return null;
    if (
      !ALLOWED_REDIRECT_PATH_PREFIXES.some(
        (p) => url.pathname === p || url.pathname.startsWith(p + "/")
      )
    ) {
      return null; // disallow arbitrary internal redirects
    }
    return url.toString();
  } catch {
    return null;
  }
}

