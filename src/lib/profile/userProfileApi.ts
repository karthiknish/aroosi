import { Profile, ProfileFormValues } from "@/types/profile";

// Types for API responses
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
};

type ProfileResponse = ApiResponse<Profile | null> & {
  isProfileComplete?: boolean;
};

// Default request timeout in milliseconds
const DEFAULT_TIMEOUT = 10000;

// Helper function to handle fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

// Helper function to handle API errors
function handleApiError(error: unknown, context: string): ApiResponse<null> {
  console.error(`[ProfileAPI] Error in ${context}:`, error);

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return {
        success: false,
        error: "Request timed out. Please check your connection and try again.",
      };
    }
    return { success: false, error: error.message };
  }

  return {
    success: false,
    error: "An unexpected error occurred. Please try again later.",
  };
}

import { getJson, postJson, putJson, deleteJson } from "@/lib/http/client";

// Helper to validate token - deprecated in token-based client usage
function validateToken(_token: string): string | null {
 return null;
}

/**
 * Fetches a user's profile with retry logic and proper error handling
 * @param token - Authentication token
 * @param userId - ID of the user whose profile to fetch
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with profile data or error
 */
export async function fetchUserProfile(
  userId: string,
  retries = 2
): Promise<ProfileResponse> {
  if (!userId) {
    console.error("[ProfileAPI] No user ID provided to fetchUserProfile");
    return { success: false, error: "No user ID provided" };
  }

  const url = `/api/profile-detail/${encodeURIComponent(userId)}`;

  try {
    const data = await getJson<any>(url);
    return {
      success: true,
      data: data?.profileData || data?.profile || data?.data || data,
      isProfileComplete: data?.isProfileComplete,
    };
  } catch (error: unknown) {
    const status = (error as any)?.status as number | undefined;
    if (status === 404) {
      return { success: true, data: null, status: 404 };
    }
    if (retries > 0) {
      console.warn(
        `[ProfileAPI] Retrying fetchUserProfile (${retries} attempts left)...`
      );
      return fetchUserProfile(userId, retries - 1);
    }
    return handleApiError(error, "fetchUserProfile");
  }
}

/**
 * Fetches a user's profile images with retry logic
 * @param token - Authentication token
 * @param userId - ID of the user whose images to fetch
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with profile images or error
 */
export async function fetchUserProfileImages(
  userId: string,
  retries = 2
): Promise<ApiResponse<{ url: string; storageId: string }[]>> {
  if (!userId) {
    console.error("[ProfileAPI] No user ID provided to fetchUserProfileImages");
    return { success: false, error: "No user ID provided" };
  }

  const url = `/api/profile-detail/${encodeURIComponent(userId)}/images`;

  try {
    const data = await getJson<any>(url);
    const images =
      (Array.isArray(data) && data) ||
      data?.userProfileImages ||
      data?.images ||
      [];

    type RawImage = {
      url?: string;
      storageId?: string;
      _id?: string;
      [key: string]: unknown;
    };
    const normalized = (images as RawImage[])
      .filter((img) => img && (img.url || img.storageId))
      .map((img) => ({
        url: img.url ?? "",
        storageId: img.storageId || img._id || "",
        ...img,
      }));

    return { success: true, data: normalized };
  } catch (error) {
    const status = (error as any)?.status as number | undefined;
    if (status === 404) {
      return { success: true, data: [], status: 404 };
    }
    if (retries > 0) {
      console.warn(
        `[ProfileAPI] Retrying fetchUserProfileImages (${retries} attempts left)...`
      );
      return fetchUserProfileImages(userId, retries - 1);
    }
    const apiError = handleApiError(error, "fetchUserProfileImages");
    return { success: false, data: [], error: apiError.error };
  }
}

/**
 * Updates a user's profile with the provided updates
 * @param token - Authentication token
 * @param updates - Partial profile data to update
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with updated profile or error
 */
export async function updateUserProfile(
  updates: Partial<Profile>,
  retries = 2
): Promise<ProfileResponse> {
  if (!updates || Object.keys(updates).length === 0) {
    console.error("[ProfileAPI] No updates provided to updateUserProfile");
    return { success: false, error: "No updates provided" };
  }

  const url = "/api/profile";

  try {
    const data = await putJson<any>(url, updates);
    return {
      success: true,
      data: data?.profile || data,
      isProfileComplete: data?.isProfileComplete,
    };
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `[ProfileAPI] Retrying updateUserProfile (${retries} attempts left)...`
      );
      return updateUserProfile(updates, retries - 1);
    }
    return handleApiError(error, "updateUserProfile");
  }
}

/**
 * Submits a user's profile (create or update)
 * @param token - Authentication token
 * @param values - Profile form values
 * @param mode - Whether creating a new profile or editing an existing one
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with operation result and profile data
 */
export async function submitProfile(
  values: Partial<ProfileFormValues>,
  mode: "create" | "edit",
  retries = 2
): Promise<ProfileResponse> {
  if (!values) {
    console.error("[ProfileAPI] No values provided to submitProfile");
    return { success: false, error: "No profile data provided" };
  }

  const sanitize = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
    const clean: Partial<T> = {};
    Object.entries(obj).forEach(([k, v]) => {
      const keep =
        v !== undefined &&
        v !== null &&
        !(typeof v === "string" && v.trim() === "") &&
        !(Array.isArray(v) && v.length === 0);
      if (keep) {
        clean[k as keyof T] = v as T[keyof T];
      }
    });
    return clean;
  };

  const profileData = sanitize({
    fullName: values.fullName,
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    profileFor: values.profileFor,
    city: values.city,
    country: values.country,
    height: values.height,
    maritalStatus: values.maritalStatus,
    physicalStatus: values.physicalStatus || "normal",
    diet: values.diet,
    smoking: (values.smoking as "no" | "occasionally" | "yes" | "") || "no",
    drinking: values.drinking || "no",
    motherTongue: values.motherTongue,
    religion: values.religion,
    ethnicity: values.ethnicity,
    education: values.education,
    occupation: values.occupation,
    annualIncome: values.annualIncome,
    phoneNumber: values.phoneNumber,
    email: values.email,
    preferredGender: values.preferredGender,
    partnerPreferenceAgeMin: values.partnerPreferenceAgeMin,
    partnerPreferenceAgeMax: values.partnerPreferenceAgeMax,
    partnerPreferenceCity: values.partnerPreferenceCity,
    aboutMe: values.aboutMe,
    profileImageIds: values.profileImageIds || [],
  });

  const requestData =
    mode === "create" ? profileData : { ...values, isProfileComplete: true };

  const url = "/api/profile";
  const method = mode === "create" ? "POST" : "PUT";

  try {
    const data =
      method === "POST"
        ? await postJson<any>(url, requestData)
        : await putJson<any>(url, requestData);

    return {
      success: true,
      data: data?.profile || data,
      isProfileComplete: true,
    };
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `[ProfileAPI] Retrying submitProfile (${retries} attempts left)...`
      );
      return submitProfile(values, mode, retries - 1);
    }
    return handleApiError(error, "submitProfile");
  }
}

/**
 * Fetches the current authenticated user's profile
 * @param token - Authentication token
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with user profile or error
 */
export async function getCurrentUserWithProfile(
  retries = 2
): Promise<ProfileResponse> {
  const url = "/api/user/me";

  try {
    const data = await getJson<any>(url);

    const profile =
      typeof data === "object" && data !== null && "profile" in data
        ? (data as { profile: Profile }).profile
        : (data as Profile);

    if (!profile) {
      throw new Error("Invalid profile data received from server");
    }

    let userId = "unknown";
    let isProfileComplete: boolean | undefined = undefined;
    if (typeof profile === "object" && profile !== null) {
      if ("userId" in profile && typeof (profile as any).userId === "string") {
        userId = (profile as any).userId;
      }
      if (
        "isProfileComplete" in profile &&
        typeof (profile as any).isProfileComplete === "boolean"
      ) {
        isProfileComplete = (profile as any).isProfileComplete;
      }
    }

    console.log(
      "[ProfileAPI] Successfully fetched profile data for user:",
      userId
    );
    return {
      success: true,
      data: profile,
      isProfileComplete,
      status: 200,
    };
  } catch (error: unknown) {
    const status = (error as any)?.status as number | undefined;
    if (status === 401) {
      console.error("[ProfileAPI] Unauthorized - invalid or expired token");
      return {
        success: false,
        error: "Your session has expired. Please sign in again.",
        status: 401,
      };
    }
    if (status === 404) {
      console.log("[ProfileAPI] Profile not found - returning empty profile");
      return {
        success: true,
        data: null,
        isProfileComplete: false,
        status: 404,
      };
    }
    if (
      retries > 0 &&
      (error instanceof TypeError ||
        (error instanceof Error &&
          (error.message.includes("Failed to fetch") ||
            error.message.includes("timed out"))))
    ) {
      console.warn(
        `[ProfileAPI] Retrying getCurrentUserWithProfile (${retries} attempts left)...`
      );
      return getCurrentUserWithProfile(retries - 1);
    }
    return handleApiError(error, "getCurrentUserWithProfile");
  }
}

/**
 * Fetches the current authenticated user's profile (profile object only)
 * @param token - Authentication token
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with user profile or error
 */
export async function fetchMyProfile(
  retries = 2
): Promise<Profile | null> {
  const url = "/api/user/me";
  try {
    const data = await getJson<any>(url);
    const profile =
      typeof data === "object" && data !== null && "profile" in data
        ? (data as { profile: Profile }).profile
        : (data as Profile);
    return profile ?? null;
  } catch (error: unknown) {
    const status = (error as any)?.status as number | undefined;
    if (
      retries > 0 &&
      (error instanceof TypeError ||
        (error instanceof Error &&
          (error.message.includes("Failed to fetch") ||
            error.message.includes("timed out"))))
    ) {
      return fetchMyProfile(retries - 1);
    }
    if (status === 404) return null;
    console.error("[fetchMyProfile] Error:", error);
    return null;
  }
}

/**
 * Deletes the current authenticated user's profile
 * @param token - Authentication token
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with operation result
 */
export async function deleteUserProfile(
  retries = 2
): Promise<ApiResponse<null>> {
  const url = "/api/profile";
  try {
    const resp = await deleteJson<string | { success?: boolean }>(url);
    return {
      success: true,
      data: null,
      status: 200,
    };
  } catch (error) {
    if (
      retries > 0 &&
      (error instanceof TypeError ||
        (error instanceof Error &&
          (error.message.includes("Failed to fetch") ||
            error.message.includes("timed out"))))
    ) {
      console.warn(
        `[ProfileAPI] Retrying deleteUserProfile (${retries} attempts left)...`
      );
      return deleteUserProfile(retries - 1);
    }
    return handleApiError(error, "deleteUserProfile");
  }
}

// -----------------------------------------------------------
// Profile Boost
// -----------------------------------------------------------

/**
 * Trigger a 24h profile boost for the authenticated user.
 * Expects server route POST /api/profile/boost to:
 *  - authenticate via Bearer token
 *  - enforce monthly quota
 *  - return JSON: { success: boolean, boostsRemaining?: number, boostedUntil?: number, message?: string }
 */
export async function boostProfile(
  retries = 1
): Promise<{ success: boolean; boostsRemaining?: number; boostedUntil?: number; message?: string }> {
  const url = "/api/profile/boost";
  try {
    const data = await postJson<any>(url, {});
    return {
      success: Boolean(data?.success ?? true),
      boostsRemaining: data?.boostsRemaining,
      boostedUntil: data?.boostedUntil,
      message: data?.message,
    };
  } catch (err) {
    if (
      retries > 0 &&
      (err instanceof TypeError ||
        (err instanceof Error &&
          (err.message.includes("Failed to fetch") ||
            err.message.includes("timed out"))))
    ) {
      return boostProfile(retries - 1);
    }
    const handled = handleApiError(err, "boostProfile");
    return { success: false, message: handled.error };
  }
}

// -----------------------------------------------------------
// Public helper: check if an email already has a completed profile
// -----------------------------------------------------------

export async function checkEmailHasProfile(
  email: string
): Promise<{ exists: boolean; hasProfile: boolean }> {
  try {
    const { getJson } = await import("@/lib/http/client");
    const data = await getJson<{ exists?: boolean; hasProfile?: boolean }>(
      `/api/profile-exists?email=${encodeURIComponent(email)}`,
      { cache: "no-store", headers: { "x-client-check": "email-has-profile" } }
    );
    return {
      exists: Boolean(data?.exists),
      hasProfile: Boolean(data?.hasProfile),
    };
  } catch {
    return { exists: false, hasProfile: false };
  }
}
