import type { ProfileSearchResult } from "@/app/(authenticated)/search/page";
import { showErrorToast } from "@/lib/ui/toast";

// Narrow reusable Result type including server pagination truth
export type ProfileSearchResponse = {
  profiles: ProfileSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  correlationId?: string;
};

/**
 * Fetches profile search results from the API.
 * Canonical filters supported by API: city, country, ageMin, ageMax, preferredGender, page, pageSize.
 * Extra filters (ethnicity, motherTongue, language) now supported server-side and sent when provided.
 * NOTE: API uses 0-based page indexing. Keep callers aligned.
 * NOTE: API uses 0-based page indexing. Keep callers aligned.
 */
export async function fetchProfileSearchResults({
  token,
  page,
  pageSize,
  city,
  country,
  ageMin,
  ageMax,
  preferredGender, // "any" | "male" | "female" | "other"
  // Additional filters now supported by API:
  ethnicity,
  motherTongue,
  language,
}: {
  token: string;
  page: number; // 0-based, matches API
  pageSize: number;
  city?: string;
  country?: string;
  ageMin?: number | string;
  ageMax?: number | string;
  preferredGender?: "any" | "male" | "female" | "other";
  ethnicity?: string; // not used by API (yet)
  motherTongue?: string; // not used by API (yet)
  language?: string; // not used by API (yet)
}): Promise<ProfileSearchResponse> {
  if (!token)
    return { profiles: [], total: 0, page: 0, pageSize: pageSize || 0 };
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

    // Extended filters (now supported by API)
    if (ethnicity && ethnicity !== "any") params.append("ethnicity", ethnicity);
    if (motherTongue && motherTongue !== "any")
      params.append("motherTongue", motherTongue);
    if (language && language !== "any") params.append("language", language);

    const url = `/api/search?${params.toString()}`;

    // Generate or forward a correlation id for tracing
    const correlationId =
      (typeof crypto !== "undefined" && "randomUUID" in crypto && (crypto as any).randomUUID?.()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-correlation-id": correlationId,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      // Specific handling for plan/limit errors
      if (response.status === 429) {
        showErrorToast(
          "Search limit reached for your current plan. Please try later or upgrade."
        );
        return { profiles: [], total: 0, page: 0, pageSize: pageSize ?? 12 };
      }
      if (response.status === 401) {
        showErrorToast("Session expired. Please sign in again.");
        return { profiles: [], total: 0, page: 0, pageSize: pageSize ?? 12 };
      }
      // Try to parse error response for debugging in dev
      let msg = `Failed to fetch search results (${response.status})`;
      try {
        const errJson = await response.json();
        const errMsg = errJson?.error || errJson?.message;
        if (errMsg && process.env.NODE_ENV === "development") {
          msg += `: ${errMsg}`;
        }
      } catch {
        // ignore json parse errors
      }
      throw new Error(msg);
    }

    const json = await response.json();
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