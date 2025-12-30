/**
 * Engagement API - Handles shortlist, notes, quick-picks, and engagement profiles
 */

import type { 
  ShortlistEntry as SharedShortlistEntry, 
  UserNote as SharedUserNote,
  QuickPick as SharedQuickPick,
  RecommendedProfile
} from "@aroosi/shared/types";

export type ShortlistEntry = SharedShortlistEntry;
export type Note = SharedUserNote;
export type QuickPick = SharedQuickPick;
export type EngagementProfile = RecommendedProfile;

class EngagementAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
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

    // Unwrap standardized { success, data } envelope from API handler
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

  // === Shortlist ===

  /**
   * Get user's shortlist
   */
  async getShortlist(): Promise<ShortlistEntry[]> {
    const res = await this.makeRequest<ShortlistEntry[]>("/api/engagement/shortlist");
    return Array.isArray(res) ? res : [];
  }

  /**
   * Add user to shortlist
   */
  async addToShortlist(toUserId: string, note?: string): Promise<ShortlistEntry> {
    return this.makeRequest("/api/engagement/shortlist", {
      method: "POST",
      body: JSON.stringify({ toUserId, note }),
    });
  }

  /**
   * Remove user from shortlist
   */
  async removeFromShortlist(toUserId: string): Promise<void> {
    return this.makeRequest("/api/engagement/shortlist", {
      method: "DELETE",
      body: JSON.stringify({ toUserId }),
    });
  }

  // === Notes ===

  async getNote(toUserId: string): Promise<Note | null> {
    try {
      const res = await this.makeRequest<{ note: string; updatedAt: number } | null>(
        `/api/engagement/notes?toUserId=${encodeURIComponent(toUserId)}`
      );
      if (!res) return null;
      return {
        id: `${toUserId}`,
        fromUserId: "", // Filled by caller if needed
        toUserId,
        note: res.note,
        createdAt: new Date(res.updatedAt),
        updatedAt: new Date(res.updatedAt),
      };
    } catch {
      return null;
    }
  }

  /**
   * Create or update a note
   */
  async saveNote(toUserId: string, content: string): Promise<Note> {
    return this.makeRequest("/api/engagement/notes", {
      method: "POST",
      body: JSON.stringify({ toUserId, content }),
    });
  }

  /**
   * Delete a note
   */
  async deleteNote(toUserId: string): Promise<void> {
    return this.makeRequest("/api/engagement/notes", {
      method: "DELETE",
      body: JSON.stringify({ toUserId }),
    });
  }

  // === Quick Picks ===

  /**
   * Get today's quick picks
   * Returns { userIds: string[], profiles: QuickPick[] }
   */
  async getQuickPicks(): Promise<{ userIds: string[]; profiles: QuickPick[] }> {
    const res = await this.makeRequest<{ userIds: string[]; profiles: QuickPick[] }>(
      "/api/engagement/quick-picks"
    );
    return {
      userIds: Array.isArray(res?.userIds) ? res.userIds : [],
      profiles: Array.isArray(res?.profiles) ? res.profiles : [],
    };
  }

  /**
   * Skip a quick pick
   */
  async skipQuickPick(pickId: string): Promise<void> {
    return this.makeRequest("/api/engagement/quick-picks", {
      method: "POST",
      body: JSON.stringify({ pickId, action: "skip" }),
    });
  }

  // === Engagement Profiles ===

  /**
   * Get recommended engagement profiles
   */
  async getProfiles(limit = 10): Promise<EngagementProfile[]> {
    const res = await this.makeRequest<EngagementProfile[] | { profiles: EngagementProfile[] }>(
      `/api/engagement/profiles?limit=${limit}`
    );
    // Handle both array and wrapped { profiles: [] } formats
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.profiles)) return res.profiles;
    return [];
  }
}

export const engagementAPI = new EngagementAPI();
