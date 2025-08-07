import type { ProfileSearchResult } from "@/app/(authenticated)/search/page";
import { showErrorToast } from "@/lib/ui/toast";
import { getJson } from "@/lib/http/client";

// Narrow reusable Result type including server pagination truth
export type ProfileSearchResponse = {
  profiles: ProfileSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  correlationId?: string;
};

/**
 * Fetches profile search results from the API using the centralized HTTP client.
 * API supports: city, country, ageMin, ageMax, preferredGender, page, pageSize,
 * and extended filters: ethnicity, motherTongue, language.
 * NOTE: API uses 0-based page indexing. Keep callers aligned.
 */
export async function fetchProfileSearchResults({
  page,
  pageSize,
  city,
  country,
  ageMin,
  ageMax,
  preferredGender, // "any" | "male" | "female" | "other"
  ethnicity,
  motherTongue,
  language,
}: {
  page: number; // 0-based, matches API
  pageSize: number;
  city?: string;
  country?: string;
  ageMin?: number | string;
  ageMax?: number | string;
  preferredGender?: "any" | "male" | "female" | "other";
  ethnicity?: string;
  motherTongue?: string;
  language?: string;
}): Promise<ProfileSearchResponse> {
  try {
    const params = new URLSearchParams({
      page: String(page ?? 0),
      pageSize: String(pageSize ?? 12),
    });

    if (city && city !== "any") params.append("city", city.trim());
    if (country && country !== "any") params.append("country", country.trim());

    // Normalize age types to strings for query params
    if (
      ageMin !== undefined &&
      ageMin !== null &&
      String(ageMin).trim() !== ""
    ) {
      params.append("ageMin", String(ageMin));
    }
    if (
      ageMax !== undefined &&
      ageMax !== null &&
      String(ageMax).trim() !== ""
    ) {
      params.append("ageMax", String(ageMax));
    }

    // Only send preferredGender if provided and not "any"
    if (preferredGender && preferredGender !== "any") {
      params.append("preferredGender", preferredGender);
    }

    // Extended filters
    if (ethnicity && ethnicity !== "any") params.append("ethnicity", ethnicity);
    if (motherTongue && motherTongue !== "any")
      params.append("motherTongue", motherTongue);
    if (language && language !== "any") params.append("language", language);

    const url = `/api/search?${params.toString()}`;

    // Generate correlation id for tracing; centralized client will forward it
    const correlationId =
      (typeof crypto !== "undefined" && "randomUUID" in crypto && (crypto as any).randomUUID?.()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Use centralized client to get automatic Authorization and 401 refresh
    const json = await getJson<any>(url, { correlationId });

    const envelope = json?.data ?? json;

    const profiles = Array.isArray(envelope?.profiles) ? envelope.profiles : [];
    const total = Number.isFinite(envelope?.total) ? Number(envelope.total) : 0;

    // Prefer server truth for page/pageSize when present
    const respPage =
      typeof envelope?.page === "number"
        ? envelope.page
        : Number(params.get("page")) || 0;
    const respPageSize =
      typeof envelope?.pageSize === "number"
        ? envelope.pageSize
        : Number(params.get("pageSize")) || 12;

    // Correlation id: prefer server-provided, fallback to the one we generated
    const resolvedCorrelationId =
      typeof envelope?.correlationId === "string" && envelope.correlationId.length > 0
        ? envelope.correlationId
        : correlationId;

    return {
      profiles,
      total,
      page: respPage,
      pageSize: respPageSize,
      correlationId: resolvedCorrelationId,
    };
  } catch (error) {
    // Handle known statuses via client-thrown error with status (attached in client.ts)
    const status = (error as any)?.status as number | undefined;
    if (status === 429) {
      showErrorToast(
        "Search limit reached for your current plan. Please try later or upgrade."
      );
      return { profiles: [], total: 0, page: 0, pageSize: pageSize ?? 12 };
    }
    if (status === 401) {
      // After centralized client refresh attempt fails, treat as expired session
      showErrorToast("Session expired. Please sign in again.");
      return { profiles: [], total: 0, page: 0, pageSize: pageSize ?? 12 };
    }

    // Provide clearer UX guidance
    showErrorToast(
      error,
      typeof (error as any)?.message === "string"
        ? (error as any).message
        : "Failed to fetch search results"
    );
    return { profiles: [], total: 0, page: Number(page) || 0, pageSize: Number(pageSize) || 12 };
  }
}