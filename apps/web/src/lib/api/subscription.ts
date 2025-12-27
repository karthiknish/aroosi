import { useQuery } from "@tanstack/react-query";
import { postJson, getJson } from "@/lib/http/client";

export interface PlanFeatureObj {
  text: string;
  included: boolean;
}

export interface NormalizedPlan {
  id: "free" | "premium" | "premiumPlus" | string;
  name: string;
  price: number; // minor units
  currency: string; // e.g. "GBP"
  features: string[] | PlanFeatureObj[];
  popular: boolean;
  // Optional UI fields that might be merged in
  description?: string;
  color?: string;
  gradient?: string;
  billing?: string;
  iconName?: string;
  highlight?: boolean;
}

/**
 * Canonical status response used by the UI.
 */
export interface SubscriptionStatusResponse {
  plan: string;
  isActive: boolean;
  daysRemaining: number;
  expiresAt: number | null;
  cancelAtPeriodEnd?: boolean;
  isTrial?: boolean;
  trialEndsAt?: number | null;
  trialDaysRemaining?: number;
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

export type TrackUsageResult = {
  feature: string;
  plan: string;
  tracked: boolean;
  currentUsage: number;
  limit: number;
  remainingQuota: number;
  isUnlimited: boolean;
  duplicate?: boolean;
  // server may include additional fields depending on feature
  [key: string]: unknown;
};

class SubscriptionAPI {
  private portalOpenInFlight = false;

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
      const payload = isJson ? await response.json().catch(() => ({})) : await response.text().catch(() => "");
      const msg = (isJson && payload && (payload as any).error) || (typeof payload === "string" && payload) || `HTTP ${response.status}`;
      const error = new Error(String(msg));
      (error as any).status = response.status;
      (error as any).payload = payload;
      throw error;
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
      cancelAtPeriodEnd?: boolean;
      isTrial?: boolean;
      trialEndsAt?: number | null;
      trialDaysRemaining?: number;
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
      cancelAtPeriodEnd: Boolean(payload.cancelAtPeriodEnd),
      isTrial: Boolean(payload.isTrial),
      trialEndsAt:
        typeof payload.trialEndsAt === "number" ? payload.trialEndsAt : null,
      trialDaysRemaining:
        typeof payload.trialDaysRemaining === "number"
          ? payload.trialDaysRemaining
          : 0,
    };
  }

  /**
   * Creates a Stripe Billing Portal session.
   */
  async openBillingPortal(): Promise<void> {
    if (this.portalOpenInFlight) return;
    this.portalOpenInFlight = true;

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await this.makeRequest("/api/stripe/portal", {
          method: "POST",
        });
        const url = res?.url ?? res?.data?.url;
        if (url) {
          window.location.assign(url);
          return;
        }
        throw new Error("No billing portal URL returned");
      } catch (error: any) {
        if (error.status === 400) {
          if (!window.location.pathname.startsWith("/plans")) {
            window.location.assign("/plans");
          }
          throw error;
        }
        if (error.status === 503 && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
          continue;
        }
        if (attempt === maxAttempts) throw error;
      } finally {
        if (attempt === maxAttempts) this.portalOpenInFlight = false;
      }
    }
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
  async cancel(
    token?: string
  ): Promise<{ message: string; accessUntil?: number; scheduled?: boolean }> {
    const data = (await this.makeRequest(
      "/api/subscription/cancel",
      { method: "POST" },
      token
    )) as { message?: string; accessUntil?: number; scheduled?: boolean };
    return {
      message: data?.message ?? "Subscription cancellation requested",
      accessUntil:
        typeof data?.accessUntil === "number" ? data.accessUntil : undefined,
      scheduled:
        typeof data?.scheduled === "boolean" ? data.scheduled : undefined,
    };
  }

  /**
   * Upgrade to a plan (creates Stripe Checkout session or server flow)
   * POST /api/stripe/checkout with { planId }
   */
  async upgrade(
    tier: string,
    options?: { successUrl?: string; cancelUrl?: string }
  ): Promise<{ message: string; url?: string }> {
    try {
      const body = JSON.stringify({
        planId: tier,
        planType: tier,
        successUrl: options?.successUrl,
        cancelUrl: options?.cancelUrl,
      });
      const data = (await this.makeRequest("/api/stripe/checkout", {
        method: "POST",
        body,
      })) as { url?: string; message?: string; error?: string };
      if (data?.url) {
        return { message: "Redirecting to checkout", url: data.url };
      }
      return { message: data?.message ?? "Checkout session created" };
    } catch (error: any) {
      if (error.status === 409) {
        await this.openBillingPortal();
        throw new Error("already-subscribed");
      }
      throw error;
    }
  }

  /**
   * Fetch normalized plans from the server
   * GET /api/stripe/plans
   */
  async getPlans(): Promise<NormalizedPlan[]> {
    const res = await this.makeRequest("/api/stripe/plans");
    return Array.isArray(res) ? res : [];
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
   * Track feature usage
   * POST /api/subscription/track-usage with { feature, metadata? }
   */
  async trackUsage(
    feature: string,
    metadata?: Record<string, unknown>
  ): Promise<TrackUsageResult> {
    // Use a dedicated fetch to preserve clean error messages from { error: string }
    const res = await fetch("/api/subscription/track-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify({ feature, ...(metadata ? { metadata } : {}) }),
    });

    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || json?.success === false) {
      const msg = String(json?.error || json?.message || `HTTP ${res.status}`);
      throw new Error(msg);
    }

    const data = (json && typeof json === "object" && "data" in json ? json.data : json) as any;
    return {
      feature: String(data?.feature ?? feature),
      plan: String(data?.plan ?? "free"),
      tracked: Boolean(data?.tracked),
      currentUsage: Number(data?.currentUsage ?? 0),
      limit: Number(data?.limit ?? 0),
      remainingQuota: Number(data?.remainingQuota ?? 0),
      isUnlimited: Boolean(data?.isUnlimited),
      ...(data && typeof data === "object" ? data : {}),
    };
  }

  /**
   * Can the current user use a given feature right now?
   * GET /api/subscription/can-use/:feature
   */
  async canUseFeature(feature: string): Promise<{ canUse: boolean; reason?: string }> {
    const res = await fetch(`/api/subscription/can-use/${encodeURIComponent(feature)}` as string, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || json?.success === false) {
      throw new Error(String(json?.error || json?.message || "Failed to check feature availability"));
    }
    const data = (json && typeof json === "object" && "data" in json ? json.data : json) as any;
    const canUse = Boolean(data?.canUse);
    const remaining = typeof data?.remaining === "number" ? data.remaining : undefined;
    const reason = !canUse && remaining === 0 ? "limit reached" : undefined;
    return { canUse, ...(reason ? { reason } : {}) };
  }

  /**
   * Refresh subscription status
   */
  async refreshSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest("/api/subscription/refresh", { method: "POST" });
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to refresh subscription";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get boost quota for the current user
   */
  async getBoostQuota(): Promise<{
    success: boolean;
    unlimited?: boolean;
    remaining?: number;
    error?: string;
  }> {
    try {
      const result = await this.makeRequest("/api/subscription/quota/boosts");
      return {
        success: true,
        unlimited: result.unlimited,
        remaining: result.remaining,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get boost quota";
      return { success: false, error: errorMessage };
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
