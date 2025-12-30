import { SUBSCRIPTION_PLANS } from "@/constants";
import type { SubscriptionPlan, SubscriptionTier } from "@aroosi/shared/types";

export type AppPlanId = "free" | "premium" | "premiumPlus";
export type BillingInterval = "monthly" | "yearly";
export type PurchasePlatform = "ios" | "android";

const DEFAULT_CURRENCY_SYMBOL = "£";

function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

function yearlyFromMonthly(monthly: number) {
  // Mobile UI shows “Save 40%” for yearly.
  return roundTo2(monthly * 12 * 0.6);
}

export function planIdToTier(planId: AppPlanId): SubscriptionTier {
  switch (planId) {
    case "free":
      return "free";
    case "premium":
      return "plus";
    case "premiumPlus":
      return "gold";
  }
}

export function getPlanCatalog(): SubscriptionPlan[] {
  const premiumMonthly = SUBSCRIPTION_PLANS.PREMIUM.price / 100;
  const premiumPlusMonthly = SUBSCRIPTION_PLANS.PREMIUM_PLUS.price / 100;

  return [
    {
      id: "free",
      name: SUBSCRIPTION_PLANS.FREE.name,
      tier: "free",
      price: { monthly: 0, yearly: 0, currency: DEFAULT_CURRENCY_SYMBOL },
      features: SUBSCRIPTION_PLANS.FREE.features,
      popular: false,
    },
    {
      id: "premium",
      name: SUBSCRIPTION_PLANS.PREMIUM.name,
      tier: "plus",
      price: {
        monthly: premiumMonthly,
        yearly: yearlyFromMonthly(premiumMonthly),
        currency: DEFAULT_CURRENCY_SYMBOL,
      },
      features: SUBSCRIPTION_PLANS.PREMIUM.features,
      popular: Boolean(SUBSCRIPTION_PLANS.PREMIUM.popular),
    },
    {
      id: "premiumPlus",
      name: SUBSCRIPTION_PLANS.PREMIUM_PLUS.name,
      tier: "gold",
      price: {
        monthly: premiumPlusMonthly,
        yearly: yearlyFromMonthly(premiumPlusMonthly),
        currency: DEFAULT_CURRENCY_SYMBOL,
      },
      features: SUBSCRIPTION_PLANS.PREMIUM_PLUS.features,
      popular: Boolean(SUBSCRIPTION_PLANS.PREMIUM_PLUS.popular),
    },
  ];
}

type ProductMatrix = Record<PurchasePlatform, Record<AppPlanId, Record<BillingInterval, string[]>>>;

// Canonical product IDs + backwards-compatible aliases.
export const IAP_PRODUCT_IDS: ProductMatrix = {
  ios: {
    free: { monthly: [], yearly: [] },
    premium: {
      monthly: ["com.aroosi.premium.monthly"],
      yearly: ["com.aroosi.premium.yearly"],
    },
    premiumPlus: {
      monthly: ["com.aroosi.premiumplus.monthly"],
      yearly: ["com.aroosi.premiumplus.yearly"],
    },
  },
  android: {
    free: { monthly: [], yearly: [] },
    premium: {
      monthly: ["aroosi_premium_monthly", "premium"],
      yearly: ["aroosi_premium_yearly", "premium_yearly"],
    },
    premiumPlus: {
      monthly: ["aroosi_premium_plus_monthly", "premiumplus", "premium_plus"],
      yearly: ["aroosi_premium_plus_yearly", "premiumplus_yearly", "premium_plus_yearly"],
    },
  },
};

export function resolvePlanFromProductId(
  platform: PurchasePlatform,
  productId: string
): { planId: Exclude<AppPlanId, "free">; interval: BillingInterval } | null {
  const needle = platform === "android" ? productId.toLowerCase() : productId;

  const plans: Array<Exclude<AppPlanId, "free">> = ["premium", "premiumPlus"];
  const intervals: BillingInterval[] = ["monthly", "yearly"];

  for (const planId of plans) {
    for (const interval of intervals) {
      const haystack = IAP_PRODUCT_IDS[platform][planId][interval].map((s) =>
        platform === "android" ? s.toLowerCase() : s
      );
      if (haystack.includes(needle)) return { planId, interval };
    }
  }

  return null;
}
