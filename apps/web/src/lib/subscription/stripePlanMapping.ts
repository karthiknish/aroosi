import { SUBSCRIPTION_PLANS } from "@/constants";
import type Stripe from "stripe";

/**
 * Centralized, memoized mapping of internal plan IDs to configured Stripe price IDs.
 * Order of precedence for each plan:
 *  1. Secure server env vars (STRIPE_PRICE_ID_*)
 *  2. Public env fallback (NEXT_PUBLIC_* used only as last resort for SSR consistency)
 *  3. Code constant SUBSCRIPTION_PLANS.PLAN.priceId
 */
export interface StripePlanMapping {
  premium?: string;
  premiumPlus?: string;
}

let cached: StripePlanMapping | null = null;

export function getStripePlanMapping(): StripePlanMapping {
  if (cached) return cached;
  cached = {
    premium:
      process.env.STRIPE_PRICE_ID_PREMIUM ||
      process.env.NEXT_PUBLIC_PREMIUM_PRICE_ID ||
      SUBSCRIPTION_PLANS.PREMIUM?.priceId,
    premiumPlus:
      process.env.STRIPE_PRICE_ID_PREMIUM_PLUS ||
      process.env.NEXT_PUBLIC_PREMIUM_PLUS_PRICE_ID ||
      SUBSCRIPTION_PLANS.PREMIUM_PLUS?.priceId,
  };
  return cached;
}

/** Normalizes internal plan id string. */
export function normaliseInternalPlan(plan: string | undefined | null) {
  if (!plan) return null;
  const p = plan.toLowerCase();
  if (p === "premium") return "premium" as const;
  if (p === "premiumplus" || p === "premium_plus") return "premiumPlus" as const;
  return null;
}

/**
 * Infer internal plan from a Stripe Price object by comparing its id and nickname.
 */
export function inferPlanFromPrice(price: Stripe.Price | null | undefined) {
  if (!price) return null;
  const mapping = getStripePlanMapping();
  const id = typeof price.id === "string" ? price.id : "";
  if (mapping.premium && id === mapping.premium) return "premium" as const;
  if (mapping.premiumPlus && id === mapping.premiumPlus) return "premiumPlus" as const;
  const nickname = (price.nickname || "").toLowerCase();
  if (/premium\s*plus|premium_plus|premium\+|plus/.test(nickname)) return "premiumPlus" as const;
  if (/premium/.test(nickname)) return "premium" as const;
  return null;
}

/**
 * Infer plan from subscription metadata / items.
 * Priority:
 *  1. metadata.planId exact match
 *  2. first item price mapping (id or nickname)
 */
export function inferPlanFromSubscription(sub: Stripe.Subscription | null | undefined) {
  if (!sub) return null;
  const metaPlan = normaliseInternalPlan(sub.metadata?.planId as any);
  if (metaPlan) return metaPlan;
  const firstItem = sub.items?.data?.[0];
  const pricePlan = inferPlanFromPrice(firstItem?.price as Stripe.Price | undefined);
  return pricePlan;
}

/**
 * Infer plan from an event that carries a Checkout Session.
 */
export function inferPlanFromCheckoutSession(session: Stripe.Checkout.Session) {
  if (session?.metadata?.planId) {
    const p = normaliseInternalPlan(session.metadata.planId);
    if (p) return p;
  }
  // session.line_items not expanded by default; rely on metadata fallback only.
  return null;
}

/** Simple helper used by API routes to log mapping context for debugging. */
export function debugStripePlanContext() {
  const mapping = getStripePlanMapping();
  return {
    hasPremium: !!mapping.premium,
    hasPremiumPlus: !!mapping.premiumPlus,
  };
}
