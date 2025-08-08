import { getJson } from "@/lib/http/client";

export type Gender = "any" | "male" | "female" | "other";

export interface SearchParams {
  city?: string;
  country?: string;
  ethnicity?: string;
  motherTongue?: string;
  language?: string;
  preferredGender?: Gender;
  ageMin?: number;
  ageMax?: number;
  page?: number;
  pageSize?: number;
}

export interface SearchResultItem {
  userId: string;
  email?: string;
  profile: {
    fullName?: string;
    city?: string;
    dateOfBirth?: string;
    isProfileComplete?: boolean;
    hiddenFromSearch?: boolean;
    boostedUntil?: number;
    subscriptionPlan?: string;
    hideFromFreeUsers?: boolean;
    profileImageUrls?: string[];
    hasSpotlightBadge?: boolean;
    spotlightBadgeExpiresAt?: number;
  };
}

export interface SearchResponse {
  profiles: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function searchProfiles(params: SearchParams): Promise<SearchResponse> {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.set(k, String(v));
  });
  const url = `/api/search${usp.toString() ? `?${usp.toString()}` : ""}`;
  return getJson<SearchResponse>(url);
}


