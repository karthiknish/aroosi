/**
 * Profile API - Handles user profile operations
 */

import type {
  UserProfile,
  ProfileBoostResponse,
  ProfileSpotlightResponse,
  Profile,
} from "@aroosi/shared/types";

export interface ProfileViewResponse {
  viewers: Array<{
    viewerId: string;
    viewedAt: string;
    viewer?: Partial<UserProfile>;
  }>;
  total: number;
}

class ProfileAPI {
  private async makeRequest<T = unknown>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> =
      options?.headers && !(options.headers instanceof Headers) && !Array.isArray(options.headers)
        ? { ...baseHeaders, ...(options.headers as Record<string, string>) }
        : baseHeaders;

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      const msg =
        (isJson && payload && ((payload as any).message || (payload as any).error)) ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    if (isJson && payload && typeof payload === "object") {
      const maybe = payload as any;
      if ("success" in maybe) {
        if (maybe.success === false) {
          throw new Error(String(maybe.message || maybe.error || "Request failed"));
        }
        if ("data" in maybe) {
          return maybe.data as T;
        }
      }
    }

    return payload as T;
  }

  /**
   * Get current user's profile
   */
  async getProfile(): Promise<Profile> {
    return this.makeRequest<Profile>("/api/profile");
  }

  /**
   * Get a specific user's profile via /api/profile?userId=...
   * (This endpoint is authenticated; server derives session from cookies.)
   */
  async getProfileForUser(userId: string): Promise<Profile> {
    return this.makeRequest<Profile>(
      `/api/profile?userId=${encodeURIComponent(userId)}`
    );
  }

  /**
   * Update current user's profile
   */
  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    return this.makeRequest<Profile>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Create current user's profile
   */
  async createProfile(data: Partial<Profile>): Promise<Profile> {
    return this.makeRequest<Profile>("/api/profile", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get another user's profile by ID
   */
  async getProfileById(userId: string): Promise<Profile> {
    return this.makeRequest<Profile>(`/api/profile-detail/${userId}`);
  }

  /**
   * Get public profile (limited data)
   */
  async getPublicProfile(
    userId: string
  ): Promise<Partial<Profile> & { userId: string }> {
    return this.makeRequest<Partial<Profile> & { userId: string }>(
      `/api/public-profile?userId=${encodeURIComponent(userId)}`
    );
  }

  /**
   * Check if a profile exists
   */
  async profileExists(userId: string): Promise<{ exists: boolean }> {
    return this.makeRequest(`/api/profile-exists?userId=${encodeURIComponent(userId)}`);
  }

  /**
   * Track a profile view
   */
  async trackView(profileId: string): Promise<void> {
    return this.makeRequest("/api/profile/view", {
      method: "POST",
      body: JSON.stringify({ profileId }),
    });
  }

  /**
   * Get profile viewers
   */
  async getViewers(options: {
    profileId?: string;
    limit?: number;
    offset?: number;
    filter?: string;
    mode?: "count" | "list";
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (options.profileId) params.set("profileId", options.profileId);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined) params.set("offset", String(options.offset));
    if (options.filter) params.set("filter", options.filter);
    if (options.mode) params.set("mode", options.mode);

    return this.makeRequest(`/api/profile/view?${params.toString()}`);
  }

  /**
   * Mark views as seen
   */
  async markViewsAsSeen(): Promise<void> {
    return this.makeRequest("/api/profile/view/seen", {
      method: "POST",
    });
  }

  /**
   * Delete current user's profile
   */
  async deleteProfile(): Promise<void> {
    try {
      await this.makeRequest("/api/user/profile", { method: "DELETE" });
    } catch (error) {
      // Fallback for legacy route
      await this.makeRequest("/api/profile/delete", { method: "DELETE" });
    }
  }

  /**
   * Boost profile visibility
   */
  async boost(): Promise<ProfileBoostResponse> {
    const res = await fetch("/api/profile/boost", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      return {
        success: false,
        code: json?.code,
        message: json?.message || json?.error || `HTTP ${res.status}`,
        boostsRemaining: json?.boostsRemaining,
        boostedUntil: json?.boostedUntil,
        unlimited: json?.unlimited,
        correlationId: json?.correlationId,
      };
    }
    return {
      success: json?.success !== false,
      code: json?.code,
      message: json?.message,
      boostsRemaining: json?.boostsRemaining,
      boostedUntil: json?.boostedUntil,
      unlimited: json?.unlimited,
      correlationId: json?.correlationId,
    };
  }

  /**
   * Enable spotlight feature
   */
  async spotlight(): Promise<ProfileSpotlightResponse> {
    const res = await fetch("/api/profile/spotlight", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      return {
        success: false,
        code: json?.code,
        message: json?.message || json?.error || `HTTP ${res.status}`,
        hasSpotlightBadge: json?.hasSpotlightBadge,
        spotlightBadgeExpiresAt: json?.spotlightBadgeExpiresAt,
        unlimited: json?.unlimited,
        correlationId: json?.correlationId,
      };
    }
    return {
      success: json?.success !== false,
      code: json?.code,
      message: json?.message,
      hasSpotlightBadge: json?.hasSpotlightBadge,
      spotlightBadgeExpiresAt: json?.spotlightBadgeExpiresAt,
      unlimited: json?.unlimited,
      correlationId: json?.correlationId,
    };
  }

  /**
   * Get a user's profile images by userId.
   * This endpoint is authenticated.
   */
  async getProfileImagesById(
    userId: string
  ): Promise<Array<{ url: string; storageId: string }>> {
    const res = await fetch(`/api/profile-detail/${encodeURIComponent(userId)}/images`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (res.status === 404) return [];
    if (!res.ok || json?.success === false) {
      throw new Error(String(json?.message || json?.error || `HTTP ${res.status}`));
    }
    const raw = Array.isArray(json?.userProfileImages)
      ? (json.userProfileImages as any[])
      : [];
    return raw
      .map((img) => ({
        url: String(img?.url || ""),
        storageId: String(img?.storageId || img?.id || img?._id || ""),
      }))
      .filter((img) => img.url.length > 0);
  }

  /**
   * Get multiple profiles in batch
   */
  async getBatch(userIds: string[]): Promise<Profile[]> {
    return this.makeRequest<Profile[]>("/api/profile/batch", {
      method: "POST",
      body: JSON.stringify({ userIds }),
    });
  }
}

export const profileAPI = new ProfileAPI();
