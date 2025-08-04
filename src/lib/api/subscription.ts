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

class SubscriptionAPI {
  /**
   * Low-level request with cookie credentials and no redirect following.
   * This version assumes API endpoints return either:
   *  - { success: true, data: ... } or
   *  - direct JSON payload
   */
  private async makeRequest(
    endpoint: string,
    options?: RequestInit,
    token?: string
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
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
      redirect: "manual",
    });

    const ct = response.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    if (!response.ok) {
      const preview = isJson ? JSON.stringify(await response.json()) : await response.text();
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
    return typeof data === "object" && data && "data" in data ? (data as any).data : data;
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
      typeof payload.subscriptionExpiresAt === "number" ? payload.subscriptionExpiresAt : null;

    const now = Date.now();
    const fallbackIsActive = expiresAt ? expiresAt > now : false;
    const msRemaining = expiresAt ? Math.max(0, expiresAt - now) : 0;
    const fallbackDaysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

    return {
      plan,
      isActive: typeof payload.isActive === "boolean" ? payload.isActive : fallbackIsActive,
      daysRemaining:
        typeof payload.daysRemaining === "number" ? payload.daysRemaining : fallbackDaysRemaining,
      expiresAt,
    };
  }

  /**
   * Creates a Stripe Billing Portal session.
   */
  async openBillingPortal(): Promise<{ url: string }> {
    const data = (await this.makeRequest("/api/stripe/portal", { method: "POST" })) as {
      success?: boolean;
      url?: string;
      error?: string;
    };
    if (!data?.url) {
      throw new Error(data?.error || "No URL returned for billing portal");
    }
    return { url: data.url };
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
