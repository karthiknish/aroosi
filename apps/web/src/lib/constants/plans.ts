import type { NormalizedPlan } from "@/lib/utils/stripeUtil";

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanConfig extends Omit<NormalizedPlan, "features"> {
  billing: string;
  description: string;
  gradient: string;
  color: string; // for badges/text
  highlight?: boolean; // for popular/recommended
  iconName?: string;
  features: PlanFeature[];
}

// Shared fallback plans used when Stripe / server returns no plans.
export const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "GBP",
    billing: "forever",
    description: "Essential features to get started",
    gradient: "bg-neutral/10",
    color: "bg-neutral",
    iconName: "Star",
    features: [
      { text: "Create profile", included: true },
      { text: "100 searches/day", included: true },
      { text: "Limited likes", included: true },
      { text: "Basic search filters", included: true },
      { text: "Unlimited messages", included: false },
      { text: "Profile Boost", included: false },
      { text: "See who viewed you", included: false },
    ],
    popular: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: 1499,
    currency: "GBP",
    billing: "per month",
    description: "Perfect for active users",
    gradient: "bg-gradient-to-br from-accent to-primary",
    color: "bg-info",
    iconName: "Crown",
    features: [
      { text: "500 searches/day", included: true },
      { text: "Unlimited messages", included: true },
      { text: "Profile Boost", included: true },
      { text: "Advanced search filters", included: true },
      { text: "Priority support", included: true },
      { text: "See who viewed you", included: false },
      { text: "Spotlight", included: false },
    ],
    popular: true,
    highlight: true,
  },
  {
    id: "premiumPlus",
    name: "Premium Plus",
    price: 3999,
    currency: "GBP",
    billing: "per month",
    description: "Maximum visibility and features",
    gradient: "bg-gradient-to-br from-primary to-secondary",
    color: "bg-accent",
    iconName: "Rocket",
    features: [
      { text: "2000 searches/day", included: true },
      { text: "Unlimited messages", included: true },
      { text: "Spotlight & Boosts", included: true },
      { text: "See who viewed you", included: true },
      { text: "Priority matching", included: true },
      { text: "Unlimited voice messages", included: true },
    ],
    popular: false,
  },
];

export default DEFAULT_PLANS;
