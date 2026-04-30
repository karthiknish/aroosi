/**
 * Presence API - Handles online presence operations
 */

import { getResponseMessage, isApiEnvelope } from "@/lib/api/safeRequest";

export interface PresenceStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

type PresenceListResponse = {
  presence?: PresenceStatus[];
};

class PresenceAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
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
   * Update current user's presence
   */
  async updatePresence(isOnline: boolean): Promise<void> {
    return this.makeRequest("/api/presence", {
      method: "POST",
      body: JSON.stringify({ isOnline }),
    });
  }

  /**
   * Get presence status for users
   */
  async getPresence(userIds: string[]): Promise<PresenceStatus[]> {
    const res = await this.makeRequest<PresenceListResponse>("/api/presence", {
      method: "POST",
      body: JSON.stringify({ userIds, action: "get" }),
    });
    return res.presence ?? [];
  }
}

export const presenceAPI = new PresenceAPI();
