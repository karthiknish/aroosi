/**
 * Search API - Handles profile search operations
 */

import type { SearchFilters as SharedSearchFilters, RecommendedProfile } from "@aroosi/shared/types";
import type { ProfileSearchResult } from "@/components/search/ProfileCard";
import { safeRequest } from "@/lib/api/safeRequest";

export type SearchFilters = SharedSearchFilters & {
  page?: number;
  pageSize?: number;
  preferredGender?: "any" | "male" | "female" | "non-binary" | "other";
  ethnicity?: string;
  motherTongue?: string;
  language?: string;
};

export type SearchResult = ProfileSearchResult;

export type ProfileSearchResponse = {
  profiles: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  correlationId?: string;
};

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
        cache: { ttlMs: 2 * 60_000 },
      }
    );
  }

  /**
   * Search for profiles with filters
   */
  async search(filters: SearchFilters): Promise<ProfileSearchResponse> {
    const params = new URLSearchParams();
    
    if (filters.page !== undefined) params.set("page", String(filters.page));
    if (filters.pageSize !== undefined) params.set("pageSize", String(filters.pageSize));
    if (filters.city && filters.city !== "any") params.set("city", filters.city.trim());
    if (filters.country && filters.country !== "any") params.set("country", filters.country.trim());
    if (filters.ageMin !== undefined && String(filters.ageMin).trim() !== "") params.set("ageMin", String(filters.ageMin));
    if (filters.ageMax !== undefined && String(filters.ageMax).trim() !== "") params.set("ageMax", String(filters.ageMax));
    if (filters.preferredGender && filters.preferredGender !== "any") params.set("preferredGender", filters.preferredGender);
    if (filters.ethnicity && filters.ethnicity !== "any") params.set("ethnicity", filters.ethnicity);
    if (filters.motherTongue && filters.motherTongue !== "any") params.set("motherTongue", filters.motherTongue);
    if (filters.language && filters.language !== "any") params.set("language", filters.language);

    const correlationId =
      (typeof crypto !== "undefined" && "randomUUID" in crypto && (crypto as any).randomUUID?.()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const res = await this.makeRequest(`/api/search?${params.toString()}`, {
      headers: { "X-Correlation-ID": correlationId }
    });
    
    const envelope = res.data || res;
    
    return {
      profiles: Array.isArray(envelope.profiles) ? envelope.profiles : [],
      total: Number.isFinite(envelope.total) ? Number(envelope.total) : 0,
      page: typeof envelope.page === "number" ? envelope.page : (filters.page || 0),
      pageSize: typeof envelope.pageSize === "number" ? envelope.pageSize : (filters.pageSize || 12),
      correlationId: envelope.correlationId || correlationId,
    };
  }

  /**
   * Get recommended profiles
   */
  async getRecommendations(limit = 10): Promise<RecommendedProfile[]> {
    const res = await this.makeRequest(`/api/recommendations?limit=${limit}`);
    return res.data?.recommendations || res.recommendations || [];
  }
}

export const searchAPI = new SearchAPI();
