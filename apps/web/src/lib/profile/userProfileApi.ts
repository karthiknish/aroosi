import { Profile, ProfileFormValues } from "@/types/profile";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
// NOTE: Client-side usage tracking for boosts removed; server is authoritative now.
import { db } from "@/lib/firebase";
import { showErrorToast } from "@/lib/ui/toast";
import { getJson } from "@/lib/http/client";
import { fetchWithFirebaseAuth } from "@/lib/api/fetchWithFirebaseAuth";

// Types for API responses
// Import centralized types
import { ApiResponse, ApiError } from "@/lib/utils/apiResponse";

type ProfileResponse = ApiResponse<Profile | null>;

// Helper function to handle API errors
function handleApiError(error: unknown, context: string): ApiResponse<null> {
  /* eslint-disable-next-line no-console */
  console.error(`[ProfileAPI] Error in ${context}:`, error);

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return {
        success: false,
        error: {
          code: "TIMEOUT_ERROR",
          message:
            "Request timed out. Please check your connection and try again.",
          details: error,
        },
      };
    }
    return {
      success: false,
      error: {
        code: "API_ERROR",
        message: error.message,
        details: error,
      },
    };
  }

  return {
    success: false,
    error: {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred. Please try again later.",
      details: error,
    },
  };
}

/**
 * Fetches a user's profile with retry logic and proper error handling
 * @param userId - ID of the user whose profile to fetch
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with profile data or error
 */
export async function fetchUserProfile(
  userId: string,
  retries = 2
): Promise<ProfileResponse> {
  if (!userId) {
    /* eslint-disable-next-line no-console */
    console.error("[ProfileAPI] No user ID provided to fetchUserProfile");
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No user ID provided" },
    };
  }

  try {
    // Use the API endpoint for fetching profile
    const response = await fetchWithFirebaseAuth(`/api/profile?userId=${userId}`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: errorData.message || `Failed to fetch profile (${response.status})`,
        },
      };
    }

    const result = await response.json();
    return {
      success: true,
      data: result.profile || result.data || null,
    };
  } catch (error: unknown) {
    if (retries > 0) {
      return fetchUserProfile(userId, retries - 1);
    }
    return handleApiError(error, "fetchUserProfile");
  }
}

/**
 * Fetches a user's profile images with retry logic
 * @param userId - ID of the user whose images to fetch
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with profile images or error
 */
export async function fetchUserProfileImages(
  userId: string,
  retries = 2
): Promise<ApiResponse<{ url: string; storageId: string }[]>> {
  if (!userId) {
    /* eslint-disable-next-line no-console */
    console.error("[ProfileAPI] No user ID provided to fetchUserProfileImages");
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No user ID provided" },
    };
  }

  try {
    const response = await fetchWithFirebaseAuth(`/api/profile-detail/${userId}/images`, {
      method: "GET",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: [] };
      }
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: errorData.message || `Failed to fetch images (${response.status})`,
        },
      };
    }

    const result = await response.json();
    const images = (result.userProfileImages || result.data || []).map((img: any) => ({
      url: img.url || "",
      storageId: img.storageId || img.id || "",
    }));

    return { success: true, data: images };
  } catch (error) {
    if (retries > 0) {
      return fetchUserProfileImages(userId, retries - 1);
    }
    const apiError = handleApiError(error, "fetchUserProfileImages");
    return { success: false, data: [], error: apiError.error };
  }
}

/**
 * Updates a user's profile with the provided updates
 * @param userId - ID of the user whose profile to update
 * @param updates - Partial profile data to update
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with updated profile or error
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Profile>,
  retries = 2
): Promise<ProfileResponse> {
  if (!userId) {
    /* eslint-disable-next-line no-console */
    console.error("[ProfileAPI] No user ID provided to updateUserProfile");
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No user ID provided" },
    };
  }

  try {
    const response = await fetchWithFirebaseAuth("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: errorData.message || `Failed to update profile (${response.status})`,
        },
      };
    }

    const result = await response.json();
    return {
      success: true,
      data: result.profile || result.data || null,
    };
  } catch (error) {
    if (retries > 0) {
      return updateUserProfile(userId, updates, retries - 1);
    }
    return handleApiError(error, "updateUserProfile");
  }
}

/**
 * Submits a user's profile (create or update)
 * @param userId - ID of the user whose profile to submit
 * @param values - Profile form values
 * @param mode - Whether creating a new profile or editing an existing one
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with operation result and profile data
 */
export async function submitProfile(
  userId: string,
  values: Partial<ProfileFormValues>,
  mode: "create" | "edit",
  retries = 2
): Promise<ProfileResponse> {
  if (!userId) {
    /* eslint-disable-next-line no-console */
    console.error("[ProfileAPI] No user ID provided to submitProfile");
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No user ID provided" },
    };
  }

  try {
    const response = await fetchWithFirebaseAuth("/api/profile", {
      method: mode === "create" ? "POST" : "PATCH",
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: errorData.message || `Failed to submit profile (${response.status})`,
        },
      };
    }

    const result = await response.json();
    return {
      success: true,
      data: result.profile || result.data || null,
    };
  } catch (error) {
    if (retries > 0) {
      return submitProfile(userId, values, mode, retries - 1);
    }
    return handleApiError(error, "submitProfile");
  }
}

/**
 * Fetches the current authenticated user's profile
 * @param userId - ID of the current user
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with user profile or error
 */
export async function getCurrentUserWithProfile(
  userId: string,
  retries = 2
): Promise<ProfileResponse> {
  if (!userId) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No user ID provided" },
    };
  }

  try {
    const profileResponse = await fetchUserProfile(userId);
    return {
      success: profileResponse.success,
      data: profileResponse.data,

      error: profileResponse.error,
    };
  } catch (error: unknown) {
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
      return getCurrentUserWithProfile(userId, retries - 1);
    }
    return handleApiError(error, "getCurrentUserWithProfile");
  }
}

/**
 * Fetches the current authenticated user's profile (profile object only)
 * @param userId - ID of the current user
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with user profile or error
 */
export async function fetchMyProfile(
  userId: string,
  retries = 2
): Promise<Profile | null> {
  if (!userId) {
    return null;
  }

  try {
    const profileResponse = await fetchUserProfile(userId);
    return profileResponse.data ?? null;
  } catch (error: unknown) {
    if (
      retries > 0 &&
      (error instanceof TypeError ||
        (error instanceof Error &&
          (error.message.includes("Failed to fetch") ||
            error.message.includes("timed out"))))
    ) {
      return fetchMyProfile(userId, retries - 1);
    }
    /* eslint-disable-next-line no-console */
    console.error("[fetchMyProfile] Error:", error);
    return null;
  }
}

/**
 * Deletes the current authenticated user's profile
 * @param userId - ID of the user whose profile to delete
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with operation result
 */
export async function deleteUserProfile(
  userId: string,
  retries = 2
): Promise<ApiResponse<null>> {
  if (!userId) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No user ID provided" },
    };
  }

  try {
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);
    return {
      success: true,
      data: null,
    };
  } catch (error) {
    if (
      retries > 0 &&
      (error instanceof TypeError ||
        (error instanceof Error &&
          (error.message.includes("Failed to fetch") ||
            error.message.includes("timed out"))))
    ) {
      /* eslint-disable-next-line no-console */
      console.warn(
        `[ProfileAPI] Retrying deleteUserProfile (${retries} attempts left)...`
      );
      return deleteUserProfile(userId, retries - 1);
    }
    return handleApiError(error, "deleteUserProfile");
  }
}

// -----------------------------------------------------------
// Profile Boost
// -----------------------------------------------------------

/**
 * Trigger a 24h profile boost for the authenticated user.
 * @param userId - ID of the user to boost
 * @param retries - Number of retry attempts (default: 1)
 */
export async function boostProfile(
  _userId: string,
  retries = 1
): Promise<{
  success: boolean;
  boostsRemaining?: number;
  boostedUntil?: number;
  message?: string;
  unlimited?: boolean;
}> {
  // The server derives the user from cookies (Firebase session token). We ignore the userId param now.
  try {
    const res = await fetch("/api/profile/boost", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || json?.success === false) {
      return {
        success: false,
        message:
          json?.message ||
          json?.error ||
          `Failed (${res.status}) to boost profile`,
      };
    }
    return {
      success: true,
      boostsRemaining: json.boostsRemaining,
      boostedUntil: json.boostedUntil,
      message: json.message,
      unlimited: json.unlimited,
    };
  } catch (err) {
    if (
      retries > 0 &&
      (err instanceof TypeError ||
        (err instanceof Error &&
          (err.message.includes("Failed to fetch") ||
            err.message.includes("timed out"))))
    ) {
      return boostProfile(_userId, retries - 1);
    }
    const handled = handleApiError(err, "boostProfile(fetch)");
    return {
      success: false,
      message:
        typeof handled.error === "string"
          ? handled.error
          : handled.error?.message,
    };
  }
}

// Activate spotlight badge (Premium Plus only). Idempotent if already active.
export async function activateSpotlight(retries = 1): Promise<{
  success: boolean;
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
  message?: string;
}> {
  try {
    const res = await fetch("/api/profile/spotlight", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return {
        success: false,
        message:
          json?.message ||
          json?.error ||
          `Failed (${res.status}) to activate spotlight`,
      };
    }
    return {
      success: true,
      hasSpotlightBadge: json.hasSpotlightBadge,
      spotlightBadgeExpiresAt: json.spotlightBadgeExpiresAt,
      message: json.message,
    };
  } catch (err) {
    if (
      retries > 0 &&
      (err instanceof TypeError ||
        (err instanceof Error &&
          (err.message.includes("Failed to fetch") ||
            err.message.includes("timed out"))))
    ) {
      return activateSpotlight(retries - 1);
    }
    const handled = handleApiError(err, "activateSpotlight");
    return {
      success: false,
      message:
        typeof handled.error === "string"
          ? handled.error
          : handled.error?.message,
    };
  }
}

// -----------------------------------------------------------
// Public helper: check if an email already has a completed profile
// -----------------------------------------------------------

export async function checkEmailHasProfile(
  email: string
): Promise<{ exists: boolean; hasProfile: boolean }> {
  try {
    // In a real implementation, you would query Firestore for users with this email
    // For now, we'll return default values
    return { exists: false, hasProfile: false };
  } catch {
    return { exists: false, hasProfile: false };
  }
}

/**
 * Fetch a user's profile images using the centralized HTTP client
 * @param userId - ID of the user whose images to fetch
 * @returns Promise with profile images or error
 */
export async function fetchUserProfileImagesViaApi(
  userId: string
): Promise<{ success: boolean; data?: string[]; error?: ApiError }> {
  if (!userId) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No user ID provided" },
    };
  }

  try {
    const result = await getJson<any>(`/api/profile-detail/${userId}/images`);

    // Back-compat: some endpoints may return a raw array of URLs
    if (Array.isArray(result)) {
      return { success: true, data: result as string[] };
    }

    // Current API: { success: true, userProfileImages: [{ url, storageId, ... }], ... }
    if (result?.success && Array.isArray(result?.userProfileImages)) {
      const urls = (result.userProfileImages as any[])
        .map((img) => img?.url)
        .filter((u) => typeof u === "string" && u.length > 0);
      return { success: true, data: urls };
    }

    // Legacy shapes
    const images: string[] =
      (Array.isArray(result?.profileImageUrls) ? result.profileImageUrls : null) ||
      (Array.isArray(result?.profileImages)
        ? result.profileImages.map((img: any) => img?.url).filter(Boolean)
        : null) ||
      (Array.isArray(result?.data?.profileImageUrls)
        ? result.data.profileImageUrls
        : []);

    return { success: true, data: images };
  } catch (error) {
    // Gracefully handle 404: treat as no images without noisy toast
    const status = (error as any)?.status as number | undefined;
    if (status === 404) {
      return { success: true, data: [] };
    }

    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch profile images";
    showErrorToast(null, errorMessage);
    return {
      success: false,
      error: { code: "API_ERROR", message: errorMessage },
    };
  }
}

// Export types
export type { Profile } from "@/types/profile";
