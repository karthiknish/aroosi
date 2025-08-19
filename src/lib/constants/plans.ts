import type { NormalizedPlan } from "@/lib/utils/stripeUtil";

// Shared fallback plans used when Stripe / server returns no plans.
export const DEFAULT_PLANS: NormalizedPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "GBP",
    features: ["Create profile", "100 searches/day", "Limited likes"],
    popular: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: 1499,
    currency: "GBP",
    features: ["500 searches/day", "Unlimited messages", "Profile Boost"],
    popular: true,
  },
  {
    id: "premiumPlus",
    name: "Premium Plus",
    price: 3999,
    currency: "GBP",
    features: ["2000 searches/day", "Unlimited messages", "Spotlight & Boosts"],
    popular: false,
  },
];

export default DEFAULT_PLANS;
