/**
 * Subscription plan helpers to avoid scattered string comparisons.
 * Source of truth plan ids: "free" | "premium" | "premiumPlus"
 */
export type PlanId = "free" | "premium" | "premiumPlus" | string;

export function isPremium(plan?: PlanId | null): boolean {
  return plan === "premium" || plan === "premiumPlus";
}

export function isPremiumPlus(plan?: PlanId | null): boolean {
  return plan === "premiumPlus";
}

export function planDisplayName(plan?: PlanId | null): string {
  switch (plan) {
    case "premium":
      return "Premium";
    case "premiumPlus":
      return "Premium Plus";
    case "free":
    case undefined:
    case null:
      return "Free";
    default:
      // Unknown custom/experimental id, show capitalized
      try {
        return String(plan)
          .replace(/([A-Z])/g, " $1")
          .replace(/^\w/, (c) => c.toUpperCase());
      } catch {
        return "Free";
      }
  }
}