/**
 * Matches API - Handles match operations
 */

import type { Match } from "@aroosi/shared/types";
import { safeRequest } from "@/lib/api/safeRequest";

export type { Match };

export type UnreadCounts = Record<string, number>;

type MatchListResponse = {
  data?: MatchListItem[];
  matches?: MatchListItem[];
};

type UnreadCountsResponse = {
  data?: { counts?: UnreadCounts };
  counts?: UnreadCounts;
};

export interface MatchListItem extends Match {
  user1Id: string | null;
  user2Id: string | null;
  userIds: string[];
  conversationId: string;
  matchedProfile?: {
    userId: string;
    fullName: string | null;
    city?: string | null;
    country?: string | null;
    occupation?: string | null;
    education?: string | null;
    aboutMe?: string | null;
    gender?: string | null;
    profileImageUrls?: string[];
  };
}

class MatchesAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<unknown> {
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> =
      options?.headers && !(options.headers instanceof Headers) && !Array.isArray(options.headers)
        ? { ...baseHeaders, ...(options.headers as Record<string, string>) }
        : baseHeaders;

    return safeRequest(
      endpoint,
      {
        method: options?.method || "GET",
        headers,
        body: options?.body,
        credentials: "include",
      },
      {
        timeoutMs: 15_000,
        cache: { ttlMs: 60_000 },
      }
    );
  }

  /**
   * Get all matches for current user
   */
  async getMatches(): Promise<MatchListItem[]> {
    const res = await this.makeRequest("/api/matches") as MatchListResponse | MatchListItem[];
    // Standard handler returns successResponse(dataArray)
    if (Array.isArray(res)) return res as MatchListItem[];
    if (Array.isArray(res.data)) return res.data as MatchListItem[];
    // Fallbacks for any legacy shapes
    if (Array.isArray(res.matches)) return res.matches as MatchListItem[];
    return [];
  }

  /**
   * Get unread counts per user (fromUserId -> unread)
   */
  async getUnreadCounts(): Promise<UnreadCounts> {
    const res = await this.makeRequest("/api/matches/unread") as UnreadCountsResponse;
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
    await this.makeRequest(`/api/matches/${encodeURIComponent(matchId)}`, {
      method: "DELETE",
    });
  }
}

export const matchesAPI = new MatchesAPI();
