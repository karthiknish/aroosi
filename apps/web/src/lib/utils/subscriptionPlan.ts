/**
 * Helpers to reason about subscription plans consistently across the UI.
 */
export const isPremium = (plan?: string | null) =>
  plan === "premium" || plan === "premiumPlus";

export const isPremiumPlus = (plan?: string | null) => plan === "premiumPlus";