/**
 * Presence API - Handles online presence operations
 */

export interface PresenceStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

class PresenceAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
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
        (isJson && payload && (payload as any).error) ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    return payload;
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
    const res = await this.makeRequest("/api/presence", {
      method: "POST",
      body: JSON.stringify({ userIds, action: "get" }),
    });
    return res.data?.presence || res.presence || [];
  }
}

export const presenceAPI = new PresenceAPI();
