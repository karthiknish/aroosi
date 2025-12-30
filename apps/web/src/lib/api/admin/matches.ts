/**
 * Admin Matches API - Handles admin match management
 */

class AdminMatchesAPI {
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
   * Get all matches
   */
  async list(params: { page?: number; pageSize?: number } = {}): Promise<{ matches: any[]; total: number; page: number; pageSize: number }> {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.pageSize) query.append("pageSize", String(params.pageSize));

    const res = await this.makeRequest(`/api/admin/matches?${query.toString()}`);
    return {
      matches: res.data?.matches || res.matches || [],
      total: res.data?.total || res.total || 0,
      page: res.data?.page || res.page || params.page || 1,
      pageSize: res.data?.pageSize || res.pageSize || params.pageSize || 20,
    };
  }

  /**
   * Get matches for a specific profile
   */
  async getProfileMatches(userId: string): Promise<any[]> {
    const res = await this.makeRequest(`/api/admin/profiles/${userId}/matches`);
    return res.data?.matches || res.matches || [];
  }

  /**
   * Create a manual match between two users
   */
  async create(user1Id: string, user2Id: string): Promise<any> {
    return this.makeRequest("/api/admin/matches/create", {
      method: "POST",
      body: JSON.stringify({ user1Id, user2Id }),
    });
  }

  /**
   * Delete a match
   */
  async delete(matchId: string): Promise<void> {
    return this.makeRequest("/api/admin/matches", {
      method: "DELETE",
      body: JSON.stringify({ matchId }),
    });
  }
}

export const adminMatchesAPI = new AdminMatchesAPI();
