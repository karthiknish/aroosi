/**
 * Search API - Handles profile search operations
 */

import type { SearchFilters as SharedSearchFilters, RecommendedProfile } from "@aroosi/shared/types";

export type SearchFilters = SharedSearchFilters;
export type SearchResult = RecommendedProfile;

class SearchAPI {
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
   * Search for profiles with filters
   */
  async search(filters: SearchFilters, limit = 20, offset = 0): Promise<{ results: SearchResult[]; total: number }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    const res = await this.makeRequest(`/api/search?${params.toString()}`);
    return {
      results: res.data?.results || res.results || [],
      total: res.data?.total || res.total || 0,
    };
  }

  /**
   * Get recommended profiles
   */
  async getRecommendations(limit = 10): Promise<SearchResult[]> {
    const res = await this.makeRequest(`/api/recommendations?limit=${limit}`);
    return res.data?.recommendations || res.recommendations || [];
  }
}

export const searchAPI = new SearchAPI();
