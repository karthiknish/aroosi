import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import crypto from "node:crypto";
// Relative import to server constants file as confirmed
import { SUBSCRIPTION_PLANS } from "../../../../constants";

/**
 * GET /api/stripe/plans
 * Returns a normalized array of subscription plans for clients:
 * [{ id, name, price (minor units), currency, features, popular }]
 */
export async function GET(_req: NextRequest) {
  try {
    if (!SUBSCRIPTION_PLANS || !SUBSCRIPTION_PLANS.FREE) {
      return errorResponse("Plans configuration unavailable", 503);
    }
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

    // Compute weak ETag based on JSON content
    const body = JSON.stringify(normalized);
    const etag =
      'W/"' +
      crypto.createHash("sha256").update(body).digest("base64").slice(0, 32) +
      '"';
    // Basic client-side cache: 5 minutes (adjust as needed)
    const headers = new Headers({
      "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      ETag: etag,
    });
    console.info("Stripe plans served", {
      scope: "stripe.plans",
      count: normalized.length,
      etag,
    });
    // Conditional request handling
    // (Clients would need to send If-None-Match manually; keep simple JSON on 200)
    const res = successResponse(normalized);
    headers.forEach((v, k) => res.headers.set(k, v));
    return res;
  } catch (error) {
    console.error("Stripe plans error", {
      scope: "stripe.plans",
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Failed to load plans", 500);
  }
}