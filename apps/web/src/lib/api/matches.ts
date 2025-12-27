/**
 * Matches API - Handles match operations
 */

import type { Match } from "@aroosi/shared/types";

export type { Match };

export type UnreadCounts = Record<string, number>;

class MatchesAPI {
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
   * Get all matches for current user
   */
  async getMatches(): Promise<Match[]> {
    const res = await this.makeRequest("/api/matches");
    // Standard handler returns successResponse(dataArray)
    if (Array.isArray(res?.data)) return res.data as Match[];
    // Fallbacks for any legacy shapes
    if (Array.isArray(res?.matches)) return res.matches as Match[];
    if (Array.isArray(res)) return res as Match[];
    return [];
  }

  /**
   * Get unread counts per user (fromUserId -> unread)
   */
  async getUnreadCounts(): Promise<UnreadCounts> {
    const res = await this.makeRequest("/api/matches/unread");
    const counts = res?.data?.counts;
    if (counts && typeof counts === "object") return counts as UnreadCounts;
    if (res?.counts && typeof res.counts === "object") return res.counts as UnreadCounts;
    return {};
  }

  /**
   * Get total unread count across all matches
   */
  async getUnreadCount(): Promise<number> {
    const counts = await this.getUnreadCounts();
    return Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }

  /**
   * Unmatch with a user
   */
  async unmatch(matchId: string): Promise<void> {
    return this.makeRequest("/api/matches", {
      method: "DELETE",
      body: JSON.stringify({ matchId }),
    });
  }
}

export const matchesAPI = new MatchesAPI();
