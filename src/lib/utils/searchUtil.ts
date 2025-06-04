import type { ProfileSearchResult } from "@/app/(authenticated)/search/page";

/**
 * Fetches profile search results from the API.
 * @param {Object} params - The search parameters.
 * @param {string} params.token - The user's auth token.
 * @param {number} params.page - The current page number.
 * @param {number} params.pageSize - The number of results per page.
 * @param {string} [params.city] - The city to filter by.
 * @param {string} [params.religion] - The religion to filter by.
 * @param {string} [params.ageMin] - The minimum age to filter by.
 * @param {string} [params.ageMax] - The maximum age to filter by.
 * @returns {Promise<{ profiles: ProfileSearchResult[]; total: number }>} The search results.
 */
export async function fetchProfileSearchResults({
  token,
  page,
  pageSize,
  city,
  religion,
  ageMin,
  ageMax,
}: {
  token: string;
  page: number;
  pageSize: number;
  city?: string;
  religion?: string;
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
    if (religion && religion !== "any") params.append("religion", religion);
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
    const data = await response.json();
    return {
      profiles: Array.isArray(data.profiles) ? data.profiles : [],
      total: typeof data.total === "number" ? data.total : 0,
    };
  } catch (error) {
    console.error("Error fetching search results:", error);
    return { profiles: [], total: 0 };
  }
}
