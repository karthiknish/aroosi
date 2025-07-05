import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import {
  checkApiRateLimit,
  logSecurityEvent,
} from "@/lib/utils/securityHeaders";

interface RequestBody {
  planId: "premium" | "premiumPlus";
}

export async function POST(req: NextRequest) {
  try {
    // Enhanced authentication
    const auth = requireUserToken(req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { token, userId } = auth;
    if (!userId) return errorResponse("User ID not found in token", 401);

    // Strict rate limiting for payment operations
    const rateLimitResult = checkApiRateLimit(
      `stripe_checkout_${userId}`,
      10,
      60000,
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
    const { planId } = body;
    if (!planId || !["premium", "premiumPlus"].includes(planId)) {
      return errorResponse("Invalid or missing planId", 400);
    }

    // Validate Stripe configuration
    const priceId =
      planId === "premium"
        ? process.env.NEXT_PUBLIC_PREMIUM_PRICE_ID ||
          process.env.STRIPE_PRICE_ID_PREMIUM
        : process.env.NEXT_PUBLIC_PREMIUM_PLUS_PRICE_ID ||
          process.env.STRIPE_PRICE_ID_PREMIUM_PLUS;
    if (!priceId) {
      console.error("Missing Stripe price ID env var for plan", planId);
      return errorResponse("Payment service configuration error", 503);
    }
    if (!stripe) {
      console.error("Stripe not configured");
      return errorResponse("Payment service temporarily unavailable", 503);
    }

    // Fetch user profile from Convex to pre-fill email and pass clerkId as metadata.
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);
    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (!profile) {
      return errorResponse("User not found", 404);
    }
    // Validate user record
    if (!profile.clerkId || typeof profile.clerkId !== "string") {
      console.error("Invalid user record - missing clerkId:", profile);
      return errorResponse("User account error", 400);
    }
    // Security check: ensure the authenticated user matches the user record
    if (profile.clerkId !== userId) {
      logSecurityEvent(
        "UNAUTHORIZED_ACCESS",
        {
          userId,
          userRecordClerkId: profile.clerkId,
          action: "stripe_checkout_user_mismatch",
        },
        req,
      );
      return errorResponse("User verification failed", 403);
    }
    // Validate and sanitize base URL
    const origin = req.headers.get("origin");
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (origin && isValidOrigin() ? origin : null) ||
      "http://localhost:3000";
    // Validate email if provided
    const customerEmail =
      profile.email && isValidEmail(profile.email) ? profile.email : undefined;
    console.log(
      `Creating Stripe checkout session for user ${userId}, plan: ${planId}`,
    );
    // Create Stripe checkout session with security considerations
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        planId,
        clerkId: profile.clerkId,
        userId, // Add for double verification in webhook
      },
      success_url: `${baseUrl}/plans?checkout=success`,
      cancel_url: `${baseUrl}/plans?checkout=cancel`,
      billing_address_collection: "required",
      payment_intent_data: {
        metadata: {
          planId,
          clerkId: profile.clerkId,
          userId,
        },
      },
    });
    if (!session || !session.url) {
      console.error("Failed to create Stripe checkout session");
      return errorResponse("Failed to create checkout session", 500);
    }
    console.log(
      `Stripe checkout session created: ${session.id} for user ${userId}`,
    );
    return successResponse({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error in Stripe checkout:", error);
    logSecurityEvent(
      "VALIDATION_FAILED",
      {
        endpoint: "stripe/checkout",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      req,
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
