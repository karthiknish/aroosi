// Centralized subscription feature limits & helper accessors
// Negative (-1) indicates unlimited

export const SUBSCRIPTION_FEATURES = [
  "message_sent",
  "profile_view",
  "search_performed",
  "interest_sent",
  "profile_boost_used",
  "voice_message_sent",
  // Added lightweight polling feature for unread message counts
  "unread_counts",
  "spotlight_badge",
] as const;
export type SubscriptionFeature = typeof SUBSCRIPTION_FEATURES[number];

export interface PlanLimitMap { [feature: string]: number; }
export interface PlanLimits { [plan: string]: PlanLimitMap; }

export const PLAN_LIMITS: PlanLimits = {
  free: {
    message_sent: 5,
    profile_view: 50,
    // Increased per request: free users previously had 20 searches/day;
    // bumping to 100 as requested.
    search_performed: 100,
    interest_sent: 3,
    profile_boost_used: 0,
    voice_message_sent: 0,
    unread_counts: -1, // allow unlimited polling; external rate limiter still applies
    spotlight_badge: 0,
  },
  premium: {
    message_sent: -1,
    profile_view: 50,
    // Set finite search limits for paid tiers per request
    search_performed: 500,
    interest_sent: -1,
    profile_boost_used: 1,
    voice_message_sent: 10,
    unread_counts: -1,
    spotlight_badge: 0,
  },
  premiumPlus: {
    message_sent: -1,
    profile_view: -1,
    search_performed: 2000,
    interest_sent: -1,
    profile_boost_used: -1,
    voice_message_sent: -1,
    unread_counts: -1,
    spotlight_badge: -1,
  },
  // alias normalization (premium_plus) if used elsewhere
  premium_plus: {
    message_sent: -1,
    profile_view: -1,
    search_performed: 2000,
    interest_sent: -1,
    profile_boost_used: -1,
    voice_message_sent: -1,
    unread_counts: -1,
    spotlight_badge: -1,
  },
};

export function normalisePlan(plan: string | undefined | null): string {
  if (!plan) return "free";
  const p = plan.trim().toLowerCase();
  if (p === "premium") return "premium";
  if (p === "premium_plus" || p === "premiumplus") return "premiumPlus";
  // canonical keys already: free, premiumplus (alias), premium, premiumplus->premiumPlus handled
  return p;
}

export function getPlanLimits(plan: string | undefined | null) {
  return PLAN_LIMITS[normalisePlan(plan)] || PLAN_LIMITS.free;
}

export function featureRemaining(plan: string | undefined | null, feature: SubscriptionFeature, used: number): { remaining: number; limit: number; unlimited: boolean; } {
  const limits = getPlanLimits(plan);
  const limit = limits[feature] ?? 0;
  if (limit === -1) return { remaining: -1, limit, unlimited: true };
  return { remaining: Math.max(0, limit - used), limit, unlimited: false };
}
