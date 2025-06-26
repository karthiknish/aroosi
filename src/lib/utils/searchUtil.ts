import type { ProfileSearchResult } from "@/app/(authenticated)/search/page";

/**
 * Fetches profile search results from the API.
 * @param {Object} params - The search parameters.
 * @param {string} params.token - The user's auth token.
 * @param {number} params.page - The current page number.
 * @param {number} params.pageSize - The number of results per page.
 * @param {string} [params.city] - The city to filter by.
 * @param {string} [params.country] - The country to filter by.
 * @param {string} [params.ageMin] - The minimum age to filter by.
 * @param {string} [params.ageMax] - The maximum age to filter by.
 * @returns {Promise<{ profiles: ProfileSearchResult[]; total: number }>} The search results.
 */
export async function fetchProfileSearchResults({
  token,
  page,
  pageSize,
  city,
  country,
  ageMin,
  ageMax,
}: {
  token: string;
  page: number;
  pageSize: number;
  city?: string;
  country?: string;
  ageMin?: string;
  ageMax?: string;
}): Promise<{ profiles: ProfileSearchResult[]; total: number }> {
  if (!token) return { profiles: [], total: 0 };
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (city && city !== "any") params.append("city", city);
    if (country && country !== "any") params.append("country", country);
    if (ageMin) params.append("ageMin", ageMin);
    if (ageMax) params.append("ageMax", ageMax);
    const response = await fetch(`/api/search?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch search results");
    }
    const json = await response.json();
    const envelope = json?.data ?? json;
    return {
      profiles: Array.isArray(envelope.profiles) ? envelope.profiles : [],
      total: typeof envelope.total === "number" ? envelope.total : 0,
    };
  } catch (error) {
    console.error("Error fetching search results:", error);
    return { profiles: [], total: 0 };
  }
}
 