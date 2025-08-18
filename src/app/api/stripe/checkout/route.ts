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

    // Validate Stripe configuration (price IDs sourced from env for each allowed plan)
    // Resolve price ID with layered fallback: env var first, then constants.priceId
    const envPriceId =
      planId === "premium"
        ? process.env.STRIPE_PRICE_ID_PREMIUM ||
          process.env.NEXT_PUBLIC_PREMIUM_PRICE_ID
        : process.env.STRIPE_PRICE_ID_PREMIUM_PLUS ||
          process.env.NEXT_PUBLIC_PREMIUM_PLUS_PRICE_ID;
    const constPriceId =
      planId === "premium"
        ? SUBSCRIPTION_PLANS.PREMIUM?.priceId
        : SUBSCRIPTION_PLANS.PREMIUM_PLUS?.priceId;
    const priceId = envPriceId || constPriceId;
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
    // Validate and sanitize base URL
    const origin = req.headers.get("origin");
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (origin && isValidOrigin() ? origin : null) ||
      "http://localhost:3000";

    // Allow client-provided success/cancel overrides if same-origin & well-formed
    const allowUrl = (u?: string | null) => {
      if (!u || typeof u !== "string") return null;
      try {
        const parsed = new URL(u, baseUrl);
        // Enforce same origin to prevent open redirect abuse
        const base = new URL(baseUrl);
        if (parsed.origin !== base.origin) return null;
        // Only allow http/https
        if (!/^https?:$/.test(parsed.protocol)) return null;
        return parsed.toString();
      } catch {
        return null;
      }
    };
    const successUrlOverride = allowUrl(body.successUrl);
    const cancelUrlOverride = allowUrl(body.cancelUrl);
    // Validate email if provided
    const customerEmail =
      userDoc.email && isValidEmail(userDoc.email) ? userDoc.email : undefined;
    console.log(
      `Creating Stripe checkout session for user ${userId}, plan: ${planId}`
    );
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
      success_url: successUrlOverride || `${baseUrl}/plans?checkout=success`,
      cancel_url: cancelUrlOverride || `${baseUrl}/plans?checkout=cancel`,
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
      console.error("Failed to create Stripe checkout session");
      return errorResponse("Failed to create checkout session", 500);
    }
    console.log(
      `Stripe checkout session created: ${stripeSession.id} for user ${userId}`
    );

    return successResponse({
      url: stripeSession.url,
      sessionId: stripeSession.id,
    });
  } catch (error) {
    console.error("Error in Stripe checkout:", error);
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

function isValidOrigin(): boolean {
  // Add your allowed origins here if needed
  return true;
}
