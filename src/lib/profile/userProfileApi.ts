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

// Helper to validate token
function validateToken(token: string): string | null {
  if (!token) {
    console.error("[ProfileAPI] No authentication token provided");
    return "No authentication token provided";
  }
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
  token: string,
  userId: string,
  retries = 2
): Promise<ProfileResponse> {
  const error = validateToken(token);
  if (error) {
    return { success: false, error };
  }

  if (!userId) {
    console.error("[ProfileAPI] No user ID provided to fetchUserProfile");
    return { success: false, error: "No user ID provided" };
  }

  const url = `/api/profile-detail/${encodeURIComponent(userId)}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: null, status: 404 };
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to fetch profile: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      success: true,
      data: data.profileData || data.profile || data.data || data,
      isProfileComplete: data.isProfileComplete,
    };
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `[ProfileAPI] Retrying fetchUserProfile (${retries} attempts left)...`
      );
      return fetchUserProfile(token, userId, retries - 1);
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
  token: string,
  userId: string,
  retries = 2
): Promise<ApiResponse<{ url: string; storageId: string }[]>> {
  const error = validateToken(token);
  if (error) {
    return { success: false, error };
  }

  if (!userId) {
    console.error("[ProfileAPI] No user ID provided to fetchUserProfileImages");
    return { success: false, error: "No user ID provided" };
  }

  const url = `/api/profile-detail/${encodeURIComponent(userId)}/images`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: [], status: 404 };
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to fetch profile images: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(data);
    // Accept any of these keys, fallback to empty array
    const images =
      (Array.isArray(data) && data) ||
      data.userProfileImages ||
      data.images ||
      [];

    // Ensure each image has at least url and storageId
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

    return {
      success: true,
      data: normalized,
    };
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `[ProfileAPI] Retrying fetchUserProfileImages (${retries} attempts left)...`
      );
      return fetchUserProfileImages(token, userId, retries - 1);
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
  token: string,
  updates: Partial<Profile>,
  retries = 2
): Promise<ProfileResponse> {
  const error = validateToken(token);
  if (error) {
    return { success: false, error };
  }

  if (!updates || Object.keys(updates).length === 0) {
    console.error("[ProfileAPI] No updates provided to updateUserProfile");
    return { success: false, error: "No updates provided" };
  }

  const url = "/api/profile";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to update profile: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      success: true,
      data: data.profile || data,
      isProfileComplete: data.isProfileComplete,
    };
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `[ProfileAPI] Retrying updateUserProfile (${retries} attempts left)...`
      );
      return updateUserProfile(token, updates, retries - 1);
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
  token: string,
  values: Partial<ProfileFormValues>,
  mode: "create" | "edit",
  retries = 2
): Promise<ProfileResponse> {
  const error = validateToken(token);
  if (error) {
    return { success: false, error };
  }

  if (!values) {
    console.error("[ProfileAPI] No values provided to submitProfile");
    return { success: false, error: "No profile data provided" };
  }

  // Format the data for profile creation/update
  const profileData = {
    fullName: values.fullName,
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    city: values.city,
    aboutMe: values.aboutMe,
    occupation: values.occupation,
    education: values.education,
    height: values.height,
    maritalStatus: values.maritalStatus,
    smoking: (values.smoking as "no" | "occasionally" | "yes" | "") || "no",
    drinking: values.drinking || "no",
    profileImageIds: values.profileImageIds || [],
    isProfileComplete: true,
  };

  const requestData =
    mode === "create" ? profileData : { ...values, isProfileComplete: true };
  const url = "/api/profile";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to ${mode} profile: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      success: true,
      data: data.profile || data,
      isProfileComplete: true,
    };
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `[ProfileAPI] Retrying submitProfile (${retries} attempts left)...`
      );
      return submitProfile(token, values, mode, retries - 1);
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
  token: string,
  retries = 2
): Promise<ProfileResponse> {
  const error = validateToken(token);
  if (error) {
    return { success: false, error };
  }

  const url = "/api/user/me";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    // Log token prefix for debugging (don't log full token for security)
    console.log(
      "[ProfileAPI] Fetching current user profile with token prefix:",
      token.substring(0, 6) + "..."
    );

    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers,
    });

    const responseText = await response.text();
    let data: unknown;

    // Safely parse JSON response
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      console.error(
        "[ProfileAPI] Failed to parse response as JSON:",
        responseText.substring(0, 200)
      );
      throw new Error(
        `Invalid JSON response: ${responseText.substring(0, 100)}...`
      );
    }

    // Handle non-OK responses
    if (!response.ok) {
      if (response.status === 401) {
        console.error("[ProfileAPI] Unauthorized - invalid or expired token");
        return {
          success: false,
          error: "Your session has expired. Please sign in again.",
          status: 401,
        };
      }

      if (response.status === 404) {
        console.log("[ProfileAPI] Profile not found - returning empty profile");
        return {
          success: true,
          data: null,
          isProfileComplete: false,
          status: 404,
        };
      }

      let errorMessage = `Failed to fetch user profile: ${response.status} ${response.statusText}`;
      if (typeof data === "object" && data !== null && "message" in data) {
        errorMessage = (data as { message?: string }).message || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Validate the response data structure
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
      if ("userId" in profile && typeof profile.userId === "string") {
        userId = profile.userId;
      }
      if (
        "isProfileComplete" in profile &&
        typeof profile.isProfileComplete === "boolean"
      ) {
        isProfileComplete = profile.isProfileComplete;
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
  } catch (error) {
    // Retry on network errors or 5xx responses
    if (
      retries > 0 &&
      (error instanceof TypeError || // Network error
        (error instanceof Error &&
          (error.message.includes("Failed to fetch") ||
            error.message.includes("timed out"))))
    ) {
      console.warn(
        `[ProfileAPI] Retrying getCurrentUserWithProfile (${retries} attempts left)...`
      );
      return getCurrentUserWithProfile(token, retries - 1);
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
  token: string,
  retries = 2
): Promise<Profile | null> {
  const error = validateToken(token);
  if (error) {
    return null;
  }

  const url = "/api/user/me";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers,
    });
    const responseText = await response.text();
    let data: unknown;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      throw new Error(
        `Invalid JSON response: ${responseText.substring(0, 100)}...`
      );
    }
    if (!response.ok) {
      let errorMessage = `Failed to fetch profile: ${response.status} ${response.statusText}`;
      if (typeof data === "object" && data !== null && "message" in data) {
        errorMessage = (data as { message?: string }).message || errorMessage;
      }
      throw new Error(errorMessage);
    }
    // The API returns the profile as data.profile or data
    const profile =
      typeof data === "object" && data !== null && "profile" in data
        ? (data as { profile: Profile }).profile
        : (data as Profile);
    return profile;
  } catch (error) {
    if (
      retries > 0 &&
      (error instanceof TypeError ||
        (error instanceof Error &&
          (error.message.includes("Failed to fetch") ||
            error.message.includes("timed out"))))
    ) {
      return fetchMyProfile(token, retries - 1);
    }
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
  token: string,
  retries = 2
): Promise<ApiResponse<null>> {
  const error = validateToken(token);
  if (error) {
    return { success: false, error };
  }

  const url = "/api/profile";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to delete profile: ${response.status} ${response.statusText}`
      );
    }

    return {
      success: true,
      data: null,
      status: response.status,
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
      return deleteUserProfile(token, retries - 1);
    }
    return handleApiError(error, "deleteUserProfile");
  }
}
