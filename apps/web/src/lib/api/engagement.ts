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

  // === Shortlist ===

  /**
   * Get user's shortlist
   */
  async getShortlist(): Promise<ShortlistEntry[]> {
    const res = await this.makeRequest("/api/engagement/shortlist");
    return res.data?.shortlist || res.shortlist || [];
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
      const res = await this.makeRequest(`/api/engagement/notes?toUserId=${encodeURIComponent(toUserId)}`);
      const note = res.data?.note || res.note || null;
      if (note && !note.note && note.content) {
        note.note = note.content;
      }
      return note;
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
   */
  async getQuickPicks(): Promise<QuickPick[]> {
    const res = await this.makeRequest("/api/engagement/quick-picks");
    return res.data?.picks || res.picks || [];
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
    const res = await this.makeRequest(`/api/engagement/profiles?limit=${limit}`);
    return res.data?.profiles || res.profiles || [];
  }
}

export const engagementAPI = new EngagementAPI();
