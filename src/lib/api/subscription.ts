import { useQuery } from "@tanstack/react-query";

/**
 * Canonical status response used by the UI.
 */
export interface SubscriptionStatusResponse {
  plan: string;
  isActive: boolean;
  daysRemaining: number;
  expiresAt: number | null;
}
 
// Usage stats response shape aligned with /api/subscription/usage
export interface SubscriptionUsageResponse {
  plan: string;
  features: Array<{
    name: string;
    used: number;
    limit: number;
    unlimited: boolean;
    remaining: number;
    percentageUsed: number;
  }>;
  // Legacy fields for backward compatibility
  messaging: {
    sent: number;
    limit: number;
  };
  profileViews: {
    count: number;
    limit: number;
  };
  searches: {
    count: number;
    limit: number;
  };
  boosts: {
    used: number;
    monthlyLimit: number;
  };
}
 
class SubscriptionAPI {
  /**
   * Low-level request with token-based auth and no redirect following.
   * This version assumes API endpoints return either:
   *  - { success: true, data: ... } or
   *  - direct JSON payload
   */
  private async makeRequest(
    endpoint: string,
    options?: RequestInit,
    _token?: string
  ): Promise<any> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let optHeaders: Record<string, string> = {};
    if (options?.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          optHeaders[key] = value as string;
        });
      } else if (Array.isArray(options.headers)) {
        for (const [key, value] of options.headers as Array<[string, string]>) {
          optHeaders[key] = value as string;
        }
      } else {
        optHeaders = options.headers as Record<string, string>;
      }
    }
    const headers: Record<string, string> = { ...baseHeaders, ...optHeaders };

    const response = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = response.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    if (!response.ok) {
      const preview = isJson
        ? JSON.stringify(await response.json())
        : await response.text();
      throw new Error(preview || `HTTP ${response.status}`);
    }
    if (!isJson) {
      // Non-JSON not expected from these endpoints
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: true, data: text };
      }
    }
    const data = await response.json();
    return typeof data === "object" && data && "data" in data
      ? (data as any).data
      : data;
  }

  /**
   * Reads canonical status from server API and normalizes safe fallbacks.
   * Accepts optional profileId/userId passthrough for admin views.
   */
  async getStatus(
    token?: string,
    profileId?: string,
    userId?: string
  ): Promise<SubscriptionStatusResponse> {
    const params = new URLSearchParams();
    if (profileId) params.append("profileId", profileId);
    if (userId) params.append("userId", userId);
    const qs = params.toString();
    const endpoint = `/api/subscription/status${qs ? `?${qs}` : ""}`;

    const payload = (await this.makeRequest(endpoint, undefined, token)) as {
      subscriptionPlan?: string | null;
      subscriptionExpiresAt?: number | null;
      isActive?: boolean;
      daysRemaining?: number;
    };

    const plan = (payload.subscriptionPlan ?? "free") || "free";
    const expiresAt =
      typeof payload.subscriptionExpiresAt === "number"
        ? payload.subscriptionExpiresAt
        : null;

    const now = Date.now();
    const fallbackIsActive = expiresAt ? expiresAt > now : false;
    const msRemaining = expiresAt ? Math.max(0, expiresAt - now) : 0;
    const fallbackDaysRemaining = Math.ceil(
      msRemaining / (24 * 60 * 60 * 1000)
    );

    return {
      plan,
      isActive:
        typeof payload.isActive === "boolean"
          ? payload.isActive
          : fallbackIsActive,
      daysRemaining:
        typeof payload.daysRemaining === "number"
          ? payload.daysRemaining
          : fallbackDaysRemaining,
      expiresAt,
    };
  }

  /**
   * Creates a Stripe Billing Portal session.
   */
  async openBillingPortal(): Promise<{ url: string }> {
    const data = (await this.makeRequest("/api/stripe/portal", {
      method: "POST",
    })) as {
      success?: boolean;
      url?: string;
      error?: string;
    };
    if (!data?.url) {
      throw new Error(data?.error || "No URL returned for billing portal");
    }
    return { url: data.url };
  }

  /**
   * Fetch subscription usage statistics
   * GET /api/subscription/usage
   */
  async getUsage(token?: string): Promise<SubscriptionUsageResponse> {
    const data = (await this.makeRequest(
      "/api/subscription/usage",
      { method: "GET" },
      token
    )) as SubscriptionUsageResponse;
    // Basic shape validation/fallbacks
    return {
      plan: typeof data?.plan === "string" ? data.plan : "free",
      features: Array.isArray(data?.features) ? data.features : [],
      messaging: {
        sent: Number(data?.messaging?.sent || 0),
        limit: Number(data?.messaging?.limit || 0),
      },
      profileViews: {
        count: Number(data?.profileViews?.count || 0),
        limit: Number(data?.profileViews?.limit || 0),
      },
      searches: {
        count: Number(data?.searches?.count || 0),
        limit: Number(data?.searches?.limit || 0),
      },
      boosts: {
        used: Number(data?.boosts?.used || 0),
        monthlyLimit: Number(data?.boosts?.monthlyLimit || 0),
      },
    };
  }

  /**
   * Cancel current user's subscription
   * POST /api/subscription/cancel
   */
  async cancel(token?: string): Promise<{ message: string }> {
    const data = (await this.makeRequest(
      "/api/subscription/cancel",
      { method: "POST" },
      token
    )) as { message?: string };
    return { message: data?.message ?? "Subscription cancellation requested" };
  }

  /**
   * Upgrade to a plan (creates Stripe Checkout session or server flow)
   * POST /api/stripe/checkout with { planId }
   */
  async upgrade(
    tier: "premium" | "premiumPlus",
    token?: string
  ): Promise<{ message: string; url?: string }> {
    const body = JSON.stringify({ planId: tier });
    const data = (await this.makeRequest(
      "/api/stripe/checkout",
      { method: "POST", body },
      token
    )) as { url?: string; message?: string; error?: string };
    if (data?.url) {
      return { message: "Redirecting to checkout", url: data.url };
    }
    return { message: data?.message ?? "Checkout session created" };
  }

  /**
   * Restore purchases (server-side reconciliation)
   * POST /api/subscription/restore
   */
  async restorePurchases(token?: string): Promise<{ message: string }> {
    const data = (await this.makeRequest(
      "/api/subscription/restore",
      { method: "POST" },
      token
    )) as { message?: string };
    return { message: data?.message ?? "Subscription restored if eligible" };
  }

  /**
   * Step 2: Minimal, well-formed feature access check.
   * Tries GET /api/subscription/features
   * - If { hasAccess: boolean } present, returns it
   * - Else if { features: [{ name, available }] } present, return match.available
   * - Else returns { hasAccess: false }
   */
  async checkFeatureAccess(
    feature: string,
    token?: string
  ): Promise<{ hasAccess: boolean; feature?: string }> {
    try {
      const res = (await this.makeRequest(
        "/api/subscription/features",
        { method: "GET" },
        token
      )) as
        | { hasAccess?: boolean; feature?: string }
        | { features?: Array<{ name: string; available: boolean }> };

      if (res && typeof (res as any).hasAccess === "boolean") {
        return { hasAccess: Boolean((res as any).hasAccess), feature };
      }
      if (res && Array.isArray((res as any).features)) {
        const match = (res as any).features.find(
          (f: any) => f && typeof f.name === "string" && f.name === feature
        );
        if (match && typeof match.available === "boolean") {
          return { hasAccess: Boolean(match.available), feature };
        }
      }
      return { hasAccess: false, feature };
    } catch {
      return { hasAccess: false, feature };
    }
  }

  /**
   * Track feature usage (optional helper if endpoint exists)
   * POST /api/subscription/track with { feature }
   */
  async trackUsage(feature: string, token?: string): Promise<{ success: boolean }> {
    try {
      const res = (await this.makeRequest(
        "/api/subscription/track",
        { method: "POST", body: JSON.stringify({ feature }) },
        token
      )) as { success?: boolean };
      return { success: Boolean(res?.success) };
    } catch {
      // Silently ignore if endpoint not present
      return { success: false };
    }
  }
}
 
export const subscriptionAPI = new SubscriptionAPI();

/**
 * React Query hook for subscription status.
 */
export function useSubscriptionStatus(options?: { profileId?: string; userId?: string }) {
  const { profileId, userId } = options || {};
  return useQuery({
    queryKey: ["subscription", "status", profileId || null, userId || null],
    queryFn: () => subscriptionAPI.getStatus(undefined, profileId, userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
