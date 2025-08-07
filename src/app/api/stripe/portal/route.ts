import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { stripe } from "@/lib/stripe";
import { api } from "@convex/_generated/api";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchQuery } from "convex/nextjs";

/**
 * POST /api/stripe/portal
 * Creates a Stripe Billing Portal session and returns { url }
 * Requires an authenticated user; looks up their Stripe customer ID via Convex.
 * Env:
 *  - STRIPE_BILLING_PORTAL_RETURN_URL (confirmed https://aroosi.app/plans)
 */
export async function POST(req: NextRequest) {
  try {
    // Require cookie/JWT auth (same pattern as checkout)
    const { userId } = await requireAuth(req);
    if (!userId) return errorResponse("User ID not found in session", 401);

    if (!stripe) {
      console.error("Stripe not configured in portal route");
      return errorResponse("Payment service temporarily unavailable", 503);
    }

    const returnUrl =
      process.env.STRIPE_BILLING_PORTAL_RETURN_URL || "https://aroosi.app/plans";

    // Fetch Stripe customer id for this user from Convex (server-side source of truth)
    let customerId: string | null = null;
    try {
      const profile = (await fetchQuery(api.users.getProfileByUserIdPublic, {
        userId: userId as unknown as import("@convex/_generated/dataModel").Id<"users">,
      } as any)) as any;
      customerId =
        profile?.stripeCustomerId ||
        profile?.billing?.customerId ||
        profile?.stripe?.customerId ||
        null;
    } catch (e) {
      console.warn("Portal route: unable to fetch profile for customer id", {
        scope: "stripe.portal",
        userId,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    if (!customerId || typeof customerId !== "string") {
      // Cannot create portal without a known Stripe customer
      console.warn("Portal route: missing Stripe customer id", {
        scope: "stripe.portal",
        userId,
      });
      return errorResponse("No billing portal available for this account", 400);
    }

    // Stripe requires a customer for billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!session?.url) {
      console.error("Failed to create Stripe billing portal session");
      return errorResponse("Failed to create billing portal session", 500);
    }

    console.info("Stripe billing portal session created", {
      scope: "stripe.portal",
      statusCode: 200,
      userId,
    });

    return successResponse({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error", {
      scope: "stripe.portal",
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Failed to create billing portal session", 500);
  }
}