import type { Profile, ProfileFormValues } from "@aroosi/shared/types";
import { doc, deleteDoc } from "firebase/firestore";
// NOTE: Client-side usage tracking for boosts removed; server is authoritative now.
import { db } from "@/lib/firebase";
import { showErrorToast } from "@/lib/ui/toast";
import { profileAPI } from "@/lib/api/profile";

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
    return {
      success: true,
      data: (await profileAPI.getProfileForUser(userId)) || null,
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
    const images = await profileAPI.getProfileImagesById(userId);
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
    return {
      success: true,
      data: (await profileAPI.updateProfile(updates)) || null,
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
    return {
      success: true,
      data:
        mode === "create"
          ? ((await profileAPI.createProfile(values as any)) || null)
          : ((await profileAPI.updateProfile(values as any)) || null),
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
    const json = await profileAPI.boost();
    if (!json?.success) {
      return { success: false, message: json?.message || "Failed to boost profile" };
    }
    return {
      success: true,
      boostsRemaining: json?.boostsRemaining,
      boostedUntil: json?.boostedUntil,
      message: json?.message,
      unlimited: json?.unlimited,
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
    const json = await profileAPI.spotlight();
    if (!json?.success) {
      return {
        success: false,
        message: json?.message || "Failed to activate spotlight",
      };
    }
    return {
      success: true,
      hasSpotlightBadge: json?.hasSpotlightBadge,
      spotlightBadgeExpiresAt: json?.spotlightBadgeExpiresAt,
      message: json?.message,
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
    const images = await profileAPI.getProfileImagesById(userId);
    return { success: true, data: images.map((i) => i.url).filter(Boolean) };
  } catch (error) {
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
export type { Profile } from "@aroosi/shared/types";
