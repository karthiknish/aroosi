interface SubscriptionStatus {
  plan: "free" | "premium" | "premiumPlus";
  isActive: boolean;
  expiresAt?: number;
  daysRemaining: number;
  boostsRemaining: number;
  hasSpotlightBadge: boolean;
  spotlightBadgeExpiresAt?: number;
}

interface UsageStats {
  plan: "free" | "premium" | "premiumPlus";
  messaging: {
    sent: number;
    received: number;
    limit: number; // -1 means unlimited
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
    remaining: number;
    monthlyLimit: number;
  };
}

interface FeatureUsageResponse {
  feature: string;
  plan: string;
  tracked: boolean;
  currentUsage: number;
  limit: number;
  remainingQuota: number;
  isUnlimited: boolean;
  resetDate: number;
}

class SubscriptionAPI {
  private async makeRequest<T>(
    endpoint: string,
    options?: RequestInit,
    token?: string
  ): Promise<T> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let optHeaders: Record<string, string> = {};
    if (options?.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          optHeaders[key] = value;
        });
      } else if (
        typeof options.headers === "object" &&
        !Array.isArray(options.headers)
      ) {
        optHeaders = options.headers as Record<string, string>;
      }
    }
    const headers: Record<string, string> = { ...baseHeaders, ...optHeaders };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`/api/subscription${endpoint}`, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Request failed");
    }

    return data.data || data;
  }

  async getStatus(token?: string): Promise<SubscriptionStatus> {
    return this.makeRequest<SubscriptionStatus>("/status", undefined, token);
  }

  async getUsage(token?: string): Promise<UsageStats> {
    return this.makeRequest<UsageStats>("/usage", undefined, token);
  }

  async cancel(token?: string): Promise<{
    message: string;
    plan: string;
    accessUntil?: number;
  }> {
    return this.makeRequest(
      "/cancel",
      {
        method: "POST",
      },
      token
    );
  }

  async upgrade(
    tier: "premium" | "premiumPlus",
    token?: string
  ): Promise<{
    message: string;
    previousPlan: string;
    newPlan: string;
    expiresAt: number;
    features: string[];
  }> {
    return this.makeRequest(
      "/upgrade",
      {
        method: "POST",
        body: JSON.stringify({ tier }),
      },
      token
    );
  }

  async trackUsage(
    feature: string,
    token?: string
  ): Promise<FeatureUsageResponse> {
    return this.makeRequest<FeatureUsageResponse>(
      "/track-usage",
      {
        method: "POST",
        body: JSON.stringify({ feature }),
      },
      token
    );
  }

  async restorePurchases(token?: string): Promise<{
    message: string;
    restored: boolean;
    subscription?: {
      plan: string;
      expiresAt: number;
      productId: string;
    };
    purchasesFound: number;
  }> {
    return this.makeRequest(
      "/restore",
      {
        method: "POST",
      },
      token
    );
  }
}

export const subscriptionAPI = new SubscriptionAPI();
export type { SubscriptionStatus, UsageStats, FeatureUsageResponse };
