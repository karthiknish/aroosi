import { Profile, ProfileFormValues } from "@/types/profile";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
// NOTE: Client-side usage tracking for boosts removed; server is authoritative now.
import { db } from "@/lib/firebase";
import { showErrorToast } from "@/lib/ui/toast";
import { getJson } from "@/lib/http/client";

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

  console.log("[ProfileAPI] fetchUserProfile called for userId:", userId);

  try {
    // Check if Firebase auth is ready before making Firestore calls
    const { auth } = await import("@/lib/firebase");
    if (!auth.currentUser) {
      console.warn("[ProfileAPI] No authenticated user, skipping fetchUserProfile for:", userId);
      return {
        success: false,
        error: { code: "AUTH_REQUIRED", message: "User not authenticated" },
      };
    }
    
    console.log("[ProfileAPI] Fetching Firestore doc for userId:", userId);
    const userDoc = await getDoc(doc(db, "users", userId));
    console.log("[ProfileAPI] Firestore doc exists:", userDoc.exists());
    
    if (userDoc.exists()) {
      const profileData = userDoc.data() as Partial<Profile>;
      console.log("[ProfileAPI] Profile data keys:", Object.keys(profileData));
      console.log("[ProfileAPI] Profile fullName:", profileData.fullName);
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
        // Default minimum preferred partner age to 18 (legal adulthood) instead of 0/undefined
        partnerPreferenceAgeMin: (() => {
          const raw = (profileData as any).partnerPreferenceAgeMin;
          const num = typeof raw === "string" ? parseInt(raw, 10) : raw;
          // If parsed number invalid or below 18, fallback
          if (typeof num !== "number" || isNaN(num) || num < 18) return 18;
          return num;
        })(),
        partnerPreferenceAgeMax:
          (profileData.partnerPreferenceAgeMax as any) || 0,
        partnerPreferenceCity: (profileData.partnerPreferenceCity as any) || [],
        partnerPreferenceReligion: profileData.partnerPreferenceReligion,
        preferredGender: (profileData.preferredGender as any) || "any",
        profileImageIds: profileData.profileImageIds || [],
        profileImageUrls: profileData.profileImageUrls || [],
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
      return { success: true, data: null };
    }
  } catch (error: unknown) {
    // Check if this is a permissions error - don't retry those
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Missing or insufficient permissions")) {
      // This is expected during auth initialization - return gracefully without noisy logging
      if (process.env.NODE_ENV === "development") {
        console.debug("[ProfileAPI] Auth token not ready yet for:", userId);
      }
      return {
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Authentication not ready" },
      };
    }
    
    if (retries > 0) {
      /* eslint-disable-next-line no-console */
      console.warn(
        `[ProfileAPI] Retrying fetchUserProfile (${retries} attempts left)...`
      );
      // Wait a bit before retrying to allow auth to settle
      await new Promise(resolve => setTimeout(resolve, 500));
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
    // Check if Firebase auth is ready before making Firestore calls
    const { auth } = await import("@/lib/firebase");
    if (!auth.currentUser) {
      console.warn("[ProfileAPI] No authenticated user, skipping fetchUserProfileImages for:", userId);
      return {
        success: false,
        error: { code: "AUTH_REQUIRED", message: "User not authenticated" },
        data: [],
      };
    }
    
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const profileData = userDoc.data() as any;

      const imagesRaw: any[] =
        profileData.profileImages || // legacy array of objects
        profileData.profileImageUrls?.map((url: string) => ({ url })) ||
        profileData.profileImageIds?.map((id: string) => ({ storageId: id })) ||
        [];

      // IMPORTANT: Do NOT import firebase-admin (server-only) here; this module is used client-side.
      // Derive bucket name from public env or heuristics instead.
      const bucketFromEnv =
        (process as any)?.env?.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        (typeof window !== "undefined"
          ? (window as any)?.__NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
          : undefined);
      // Attempt to infer from any existing profileImageUrls if env missing
      let inferredBucket: string | undefined = bucketFromEnv;
      if (!inferredBucket) {
        const sampleUrl: string | undefined = (
          profileData.profileImageUrls || []
        ).find((u: string) => /https:\/\/storage.googleapis.com\//.test(u));
        if (sampleUrl) {
          const m = sampleUrl.match(
            /https:\/\/storage.googleapis.com\/([^/]+)\//
          );
          // eslint-disable-next-line prefer-destructuring
          if (m) inferredBucket = m[1];
        }
      }
      // Fallback: derive from project id if available
      if (!inferredBucket) {
        const projectId =
          (process as any)?.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
        if (projectId) inferredBucket = `${projectId}.appspot.com`;
      }
      const bucketName = inferredBucket || ""; // empty string if truly unknown (repair skipped)
      const needsRepair: { index: number; canonical: string }[] = [];
      const normalized = imagesRaw
        .filter((img: any) => img && (img.url || img.storageId))
        .map((img: any, index: number) => {
          const storageId =
            (img.storageId as string) || (img.id as string) || "";
          let url = (img.url as string) || "";
          const canonical = storageId
            ? `https://storage.googleapis.com/${bucketName}/${storageId}`
            : "";
          if (storageId && bucketName) {
            // Repair if url missing or host not storage.googleapis.com (only if we know bucket)
            if (!url || !/^https:\/\/storage\.googleapis\.com\//.test(url)) {
              url = canonical;
              needsRepair.push({ index, canonical });
            }
          }
          return { url, storageId };
        });
      // If any repairs needed, patch Firestore arrays quietly (best-effort)
      if (bucketName && needsRepair.length > 0) {
        try {
          const docRef = doc(db, "users", userId);
          // Reconstruct arrays ensuring index alignment with profileImageIds
          const fixedUrls = normalized.map((n) => n.url);
          await setDoc(
            docRef,
            { profileImageUrls: fixedUrls, updatedAt: Date.now() },
            { merge: true }
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[ProfileAPI] Failed to persist repaired image URLs", e);
        }
      }

      return { success: true, data: normalized };
    } else {
      console.log(
        "[ProfileAPI] User document does not exist for userId:",
        userId
      );
      return { success: true, data: [] };
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
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No user ID provided" },
    };
  }

  if (!updates || Object.keys(updates).length === 0) {
    /* eslint-disable-next-line no-console */
    console.error("[ProfileAPI] No updates provided to updateUserProfile");
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No updates provided" },
    };
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
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No user ID provided" },
    };
  }

  if (!values) {
    /* eslint-disable-next-line no-console */
    console.error("[ProfileAPI] No values provided to submitProfile");
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No profile data provided" },
    };
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
