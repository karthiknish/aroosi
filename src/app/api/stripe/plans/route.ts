import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
// Relative import to server constants file as confirmed
import { SUBSCRIPTION_PLANS } from "../../../../constants";

/**
 * GET /api/stripe/plans
 * Returns a normalized array of subscription plans for clients:
 * [{ id, name, price (minor units), currency, features, popular }]
 */
export async function GET(_req: NextRequest) {
  try {
    // Normalize from server constants
    // SUBSCRIPTION_PLANS expected shape (from aroosi/src/constants/index.ts):
    // {
    //   FREE:    { name, price, features[], popular },
    //   PREMIUM: { name, price, priceId, features[], popular },
    //   PREMIUM_PLUS: { name, price, priceId, features[], popular }
    // }
    const normalized = [
      {
        id: "free",
        name: SUBSCRIPTION_PLANS.FREE.name,
        price: Number(SUBSCRIPTION_PLANS.FREE.price) || 0, // minor units
        currency: "GBP",
        features: Array.isArray(SUBSCRIPTION_PLANS.FREE.features)
          ? SUBSCRIPTION_PLANS.FREE.features
          : [],
        popular: !!SUBSCRIPTION_PLANS.FREE.popular,
      },
      {
        id: "premium",
        name: SUBSCRIPTION_PLANS.PREMIUM.name,
        price: Number(SUBSCRIPTION_PLANS.PREMIUM.price) || 0, // minor units
        currency: "GBP",
        features: Array.isArray(SUBSCRIPTION_PLANS.PREMIUM.features)
          ? SUBSCRIPTION_PLANS.PREMIUM.features
          : [],
        popular: !!SUBSCRIPTION_PLANS.PREMIUM.popular,
      },
      {
        id: "premiumPlus",
        name: SUBSCRIPTION_PLANS.PREMIUM_PLUS.name,
        price: Number(SUBSCRIPTION_PLANS.PREMIUM_PLUS.price) || 0, // minor units
        currency: "GBP",
        features: Array.isArray(SUBSCRIPTION_PLANS.PREMIUM_PLUS.features)
          ? SUBSCRIPTION_PLANS.PREMIUM_PLUS.features
          : [],
        popular: !!SUBSCRIPTION_PLANS.PREMIUM_PLUS.popular,
      },
    ];

    console.info("Stripe plans served", {
      scope: "stripe.plans",
      count: normalized.length,
    });

    return successResponse(normalized);
  } catch (error) {
    console.error("Stripe plans error", {
      scope: "stripe.plans",
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Failed to load plans", 500);
  }
}