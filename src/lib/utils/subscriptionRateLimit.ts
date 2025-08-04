import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/apiResponse";

export interface RateLimitConfig {
  free: number;
  premium: number;
  premiumPlus: number;
}

export interface SubscriptionRateLimit {
  identifier: string;
  feature: string;
  maxRequests: RateLimitConfig;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  plan: string;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Subscription-based rate limiting using existing subscription API
 */
export class SubscriptionRateLimiter {
  /**
   * Get subscription status from existing API
   */
  async getSubscriptionStatus(
    request: NextRequest,
    token: string
  ): Promise<{ plan: string; canUseFeature: boolean }> {
    try {
      const cookieHeader = request.headers.get("cookie") || "";
      const url = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/subscription/status`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          cookie: cookieHeader,
          Accept: "application/json",
        },
        // Ensure we don't follow redirects that could yield HTML without JSON
        redirect: "manual",
      });

      const ct = response.headers.get("content-type") || "";
      if (!response.ok || !ct.toLowerCase().includes("application/json")) {
        const text = await response.text().catch(() => "");
        console.warn("Subscription status non-JSON or not ok", {
          url,
          status: response.status,
          contentType: ct,
          bodyPreview: text.slice(0, 200),
        });
        return { plan: "free", canUseFeature: true };
      }

      const data = (await response.json()) as { subscriptionPlan?: string };
      return {
        plan: data.subscriptionPlan || "free",
        canUseFeature: true,
      };
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      return { plan: "free", canUseFeature: true };
    }
  }

  /**
   * Check if user can use a specific feature
   */
  async checkFeatureAccess(
    request: NextRequest,
    token: string,
    feature: string
  ): Promise<{ canUse: boolean; plan: string; error?: string }> {
    try {
      const cookieHeader = request.headers.get("cookie") || "";
      const url = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/subscription/can-use/${encodeURIComponent(feature)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          cookie: cookieHeader,
          Accept: "application/json",
        },
        redirect: "manual",
      });

      const ct = response.headers.get("content-type") || "";

      if (!response.ok || !ct.toLowerCase().includes("application/json")) {
        const text = await response.text().catch(() => "");
        console.warn("Feature access check non-JSON or not ok", {
          url,
          status: response.status,
          contentType: ct,
          bodyPreview: text.slice(0, 200),
        });
        // Avoid JSON.parse on HTML, return explicit failure to prevent throws
        return { canUse: false, plan: "free", error: "Failed to check feature access" };
      }

      const data = (await response.json()) as { canUse: boolean; plan: string };
      return { canUse: data.canUse, plan: data.plan };
    } catch (error) {
      console.error("Error checking feature access:", error);
      // Fail closed to avoid overuse when feature check fails
      return { canUse: false, plan: "free", error: "Feature access check error" };
    }
  }

  /**
   * Get rate limit based on subscription tier
   */
  private getRateLimitForPlan(plan: string, feature: string): number {
    // Canonicalize feature aliases
    const normalized =
      feature === "message_send" ? "message_sent" :
      feature === "voice_send" ? "voice_message_sent" :
      feature;

    const limits = {
      message_sent: {
        free: 10, // 10 messages per minute
        premium: 50, // 50 messages per minute
        premiumPlus: 200, // 200 messages per minute
      },
      profile_view: {
        free: 30, // 30 profile views per minute
        premium: 100, // 100 profile views per minute
        premiumPlus: 500, // 500 profile views per minute
      },
      search_performed: {
        free: 20, // 20 searches per minute
        premium: 100, // 100 searches per minute
        premiumPlus: 500, // 500 searches per minute
      },
      interest_sent: {
        free: 5, // 5 interests per minute
        premium: 25, // 25 interests per minute
        premiumPlus: 100, // 100 interests per minute
      },
      profile_boost_used: {
        free: 1, // 1 boost per day
        premium: 3, // 3 boosts per day
        premiumPlus: 10, // 10 boosts per day
      },
      voice_message_sent: {
        free: 5, // 5 voice messages per minute
        premium: 25, // 25 voice messages per minute
        premiumPlus: 100, // 100 voice messages per minute
      },
    } as const;

    const featureLimits =
      limits[normalized as keyof typeof limits] || limits.search_performed;
    return (
      featureLimits[plan as keyof typeof featureLimits] || featureLimits.free
    );
  }

  /**
   * Check rate limit with subscription tier awareness
   */
  async checkSubscriptionRateLimit(
    request: NextRequest,
    token: string,
    userId: string,
    feature: string,
    windowMs: number = 60000
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    plan: string;
    limit: number;
    error?: string;
  }> {
    const now = Date.now();

    // Check feature access first (cookie-based auth). If the feature check fails or returns non-JSON, fail closed.
    const featureCheck = await this.checkFeatureAccess(request, token, feature);
    if (!featureCheck.canUse) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + windowMs,
        plan: featureCheck.plan,
        limit: 0,
        error: featureCheck.error || "Feature not available for your plan",
      };
    }

    const plan = featureCheck.plan;
    const maxRequests = this.getRateLimitForPlan(plan, feature);

    const key = `${userId}_${feature}_${plan}`;
    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new rate limit entry
      const resetTime = now + windowMs;
      rateLimitStore.set(key, { count: 1, resetTime, plan });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
        plan,
        limit: maxRequests,
      };
    }

    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
        plan,
        limit: maxRequests,
        error: `Rate limit exceeded for ${feature}. Upgrade your plan for higher limits.`,
      };
    }

    current.count++;
    return {
      allowed: true,
      remaining: maxRequests - current.count,
      resetTime: current.resetTime,
      plan,
      limit: maxRequests,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(rateLimitStore.entries())) {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => rateLimitStore.delete(key));
  }
}

/**
 * Entitlement helpers to centralize plan checks and display mapping.
 */
export type PlanId = "free" | "premium" | "premiumPlus" | (string & {});

export function isPremium(plan?: string | null): boolean {
  return plan === "premium" || plan === "premiumPlus";
}

export function isPremiumPlus(plan?: string | null): boolean {
  return plan === "premiumPlus";
}

/**
 * Map planId to a human-friendly display name.
 */
export function planDisplayName(plan?: string | null): string {
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
      return String(plan).charAt(0).toUpperCase() + String(plan).slice(1);
  }
}

export const subscriptionRateLimiter = new SubscriptionRateLimiter();

// Cleanup expired entries every 5 minutes
setInterval(
  () => {
    subscriptionRateLimiter.cleanup();
  },
  5 * 60 * 1000
);
