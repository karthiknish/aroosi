/**
 * Profile API - Handles user profile operations
 */

import type {
  UserProfile,
  ProfileBoostResponse,
  ProfileSpotlightResponse,
  Profile,
} from "@aroosi/shared/types";
import { getResponseMessage, isApiEnvelope, isJsonObject, type JsonObject } from "@/lib/api/safeRequest";

export interface ProfileViewResponse {
  viewers: Array<{
    viewerId: string;
    viewedAt: string;
    viewer?: Partial<UserProfile>;
  }>;
  total: number;
}

function readString(record: JsonObject, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(record: JsonObject, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

function readBoolean(record: JsonObject, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

type ProfileImagesResponse = {
  userProfileImages?: Array<Record<string, unknown>>;
};

class ProfileAPI {
  private async makeRequest<T = unknown>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (options?.headers) {
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    }

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload: unknown = isJson
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(getResponseMessage(payload) ?? `HTTP ${res.status}`);
    }

    if (isApiEnvelope<T>(payload)) {
      if (payload.success === false) {
        throw new Error(getResponseMessage(payload) ?? "Request failed");
      }

      if ("data" in payload) {
        return payload.data as T;
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
  } = {}): Promise<ProfileViewResponse | { count: number }> {
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
    await this.makeRequest("/api/profile", { method: "DELETE" });
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
    const payload: unknown = await res.json().catch(() => ({}));
    const json = isJsonObject(payload) ? payload : {};
    if (!res.ok) {
      return {
        success: false,
        code: readString(json, "code"),
        message: readString(json, "message") || readString(json, "error") || `HTTP ${res.status}`,
        boostsRemaining: readNumber(json, "boostsRemaining"),
        boostedUntil: readNumber(json, "boostedUntil"),
        unlimited: readBoolean(json, "unlimited"),
        correlationId: readString(json, "correlationId"),
      };
    }
    return {
      success: json.success !== false,
      code: readString(json, "code"),
      message: readString(json, "message"),
      boostsRemaining: readNumber(json, "boostsRemaining"),
      boostedUntil: readNumber(json, "boostedUntil"),
      unlimited: readBoolean(json, "unlimited"),
      correlationId: readString(json, "correlationId"),
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
    const payload: unknown = await res.json().catch(() => ({}));
    const json = isJsonObject(payload) ? payload : {};
    if (!res.ok) {
      return {
        success: false,
        code: readString(json, "code"),
        message: readString(json, "message") || readString(json, "error") || `HTTP ${res.status}`,
        hasSpotlightBadge: readBoolean(json, "hasSpotlightBadge"),
        spotlightBadgeExpiresAt: readNumber(json, "spotlightBadgeExpiresAt"),
        unlimited: readBoolean(json, "unlimited"),
        correlationId: readString(json, "correlationId"),
      };
    }
    return {
      success: json.success !== false,
      code: readString(json, "code"),
      message: readString(json, "message"),
      hasSpotlightBadge: readBoolean(json, "hasSpotlightBadge"),
      spotlightBadgeExpiresAt: readNumber(json, "spotlightBadgeExpiresAt"),
      unlimited: readBoolean(json, "unlimited"),
      correlationId: readString(json, "correlationId"),
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
    const payload: unknown = await res.json().catch(() => ({}));
    const json = isJsonObject(payload) ? payload : {};
    if (res.status === 404) return [];
    if (!res.ok || json.success === false) {
      throw new Error(getResponseMessage(json) ?? `HTTP ${res.status}`);
    }

    const response = json as ProfileImagesResponse;
    const raw = Array.isArray(response.userProfileImages)
      ? response.userProfileImages
      : [];

    return raw
      .map((img) => ({
        url: isJsonObject(img) && typeof img.url === "string" ? img.url : "",
        storageId:
          isJsonObject(img) && typeof img.storageId === "string"
            ? img.storageId
            : isJsonObject(img) && typeof img.id === "string"
            ? img.id
            : isJsonObject(img) && typeof img._id === "string"
            ? img._id
            : "",
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
