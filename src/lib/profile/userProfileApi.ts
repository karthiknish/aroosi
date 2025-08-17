import { Profile, ProfileFormValues } from "@/types/profile";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
// NOTE: Client-side usage tracking for boosts removed; server is authoritative now.
import { db } from "@/lib/firebase";
import { showErrorToast } from "@/lib/ui/toast";

// Types for API responses
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
};

type ProfileResponse = ApiResponse<Profile | null>;

// Helper function to handle API errors
function handleApiError(error: unknown, context: string): ApiResponse<null> {
  /* eslint-disable-next-line no-console */
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
    return { success: false, error: "No user ID provided" };
  }

  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const profileData = userDoc.data() as Partial<Profile>;
      // Ensure required identifiers are present
      const normalized: Profile = {
        // Firestore document key serves as userId linkage
        userId: (profileData.userId as any) || (userId as any),
        _id:
          (profileData._id as any) ||
          (profileData.userId as any) ||
          (userId as any),
        email: profileData.email || "",
        role: profileData.role,
        profileFor: (profileData as any).profileFor || "self",
        fullName: profileData.fullName || "",
        dateOfBirth: profileData.dateOfBirth || "",
        gender: (profileData.gender as any) || "other",
        city: profileData.city || "",
        country: profileData.country || "",
        phoneNumber: profileData.phoneNumber || "",
        aboutMe: profileData.aboutMe || "",
        height: profileData.height || "",
        maritalStatus: (profileData.maritalStatus as any) || "single",
        education: profileData.education || "",
        occupation: profileData.occupation || "",
        annualIncome: profileData.annualIncome || "",
        diet: (profileData.diet as any) || "",
        smoking: (profileData.smoking as any) || "no",
        drinking: (profileData.drinking as any) || "no",
        physicalStatus: (profileData.physicalStatus as any) || "normal",
        partnerPreferenceAgeMin:
          (profileData.partnerPreferenceAgeMin as any) || 0,
        partnerPreferenceAgeMax:
          (profileData.partnerPreferenceAgeMax as any) || 0,
        partnerPreferenceCity: (profileData.partnerPreferenceCity as any) || [],
        partnerPreferenceReligion: profileData.partnerPreferenceReligion,
        preferredGender: (profileData.preferredGender as any) || "any",
        profileImageIds: profileData.profileImageIds || [],
        profileImageUrls: profileData.profileImageUrls || [],
        isOnboardingComplete: !!profileData.isOnboardingComplete,
        isApproved: profileData.isApproved,
        hideFromFreeUsers: profileData.hideFromFreeUsers,
        banned: !!profileData.banned,
        createdAt: profileData.createdAt || Date.now(),
        updatedAt: profileData.updatedAt || Date.now(),
        _creationTime: profileData._creationTime,
        subscriptionPlan: profileData.subscriptionPlan,
        subscriptionExpiresAt: profileData.subscriptionExpiresAt,
        boostsRemaining: profileData.boostsRemaining,
        boostsMonth: profileData.boostsMonth,
        hasSpotlightBadge: profileData.hasSpotlightBadge,
        spotlightBadgeExpiresAt: profileData.spotlightBadgeExpiresAt,
        boostedUntil: profileData.boostedUntil,
        motherTongue: profileData.motherTongue,
        religion: profileData.religion,
        ethnicity: profileData.ethnicity,
        images: (profileData as any).images,
        interests: profileData.interests,
      };
      return {
        success: true,
        data: normalized,
      };
    } else {
      return { success: true, data: null, status: 404 };
    }
  } catch (error: unknown) {
    if (retries > 0) {
      /* eslint-disable-next-line no-console */
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
    return { success: false, error: "No user ID provided" };
  }

  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const profileData = userDoc.data() as any;
      const imagesRaw: any[] =
        profileData.profileImages || // legacy array of objects
        profileData.profileImageUrls?.map((url: string) => ({ url })) ||
        profileData.profileImageIds?.map((id: string) => ({ storageId: id })) ||
        [];

      const normalized = imagesRaw
        .filter((img: any) => img && (img.url || img.storageId))
        .map((img: any) => ({
          url: (img.url as string) || "",
          storageId: (img.storageId as string) || (img.id as string) || "",
        }));

      return { success: true, data: normalized };
    } else {
      return { success: true, data: [], status: 404 };
    }
  } catch (error) {
    if (retries > 0) {
      /* eslint-disable-next-line no-console */
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
    return { success: false, error: "No user ID provided" };
  }

  if (!updates || Object.keys(updates).length === 0) {
    /* eslint-disable-next-line no-console */
    console.error("[ProfileAPI] No updates provided to updateUserProfile");
    return { success: false, error: "No updates provided" };
  }

  try {
    const userRef = doc(db, "users", userId);
    const updateData = {
      ...updates,
      updatedAt: Date.now(),
    };

    await updateDoc(userRef, updateData);

    // Fetch updated profile
    const updatedProfile = await fetchUserProfile(userId);
    return {
      success: true,
      data: updatedProfile.data,
    };
  } catch (error) {
    if (retries > 0) {
      /* eslint-disable-next-line no-console */
      console.warn(
        `[ProfileAPI] Retrying updateUserProfile (${retries} attempts left)...`
      );
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
    return { success: false, error: "No user ID provided" };
  }

  if (!values) {
    /* eslint-disable-next-line no-console */
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

  const requestData = {
    ...profileData,
    // isOnboardingComplete is derived separately; do not set here
    updatedAt: Date.now(),
  };

  if (mode === "create") {
    (requestData as any).createdAt = Date.now();
  }

  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, requestData, { merge: true });

    // Fetch updated profile
    const updatedProfile = await fetchUserProfile(userId);
    return {
      success: true,
      data: updatedProfile.data,
    };
  } catch (error) {
    if (retries > 0) {
      /* eslint-disable-next-line no-console */
      console.warn(
        `[ProfileAPI] Retrying submitProfile (${retries} attempts left)...`
      );
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
      error: "No user ID provided",
      status: 401,
    };
  }

  try {
    const profileResponse = await fetchUserProfile(userId);
    return {
      success: profileResponse.success,
      data: profileResponse.data,
      status: profileResponse.status,
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
    return { success: false, error: "No user ID provided" };
  }

  try {
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);
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
    return { success: false, message: handled.error };
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
    // In a real implementation, you would query Firestore for users with this email
    // For now, we'll return default values
    return { exists: false, hasProfile: false };
  } catch {
    return { exists: false, hasProfile: false };
  }
}

// Export types
export type { Profile } from "@/types/profile";
