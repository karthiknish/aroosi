import type { Profile, ProfileImageInfo } from "@aroosi/shared/types";

type AdminProfile = Profile & { _id: string; userId: string };

function normalizeProfileImageInfo(raw: any): ProfileImageInfo | null {
  const url = raw?.url;
  const storageId = raw?.storageId ?? raw?.id ?? raw?._id;
  if (typeof url !== "string" || url.length === 0) return null;
  if (typeof storageId !== "string" || storageId.length === 0) return null;

  return {
    url,
    storageId,
    fileName: typeof raw?.fileName === "string" ? raw.fileName : undefined,
    uploadedAt:
      typeof raw?.uploadedAt === "string" ? raw.uploadedAt : undefined,
    size:
      typeof raw?.size === "number"
        ? raw.size
        : typeof raw?.fileSize === "number"
          ? raw.fileSize
          : undefined,
    contentType:
      typeof raw?.contentType === "string" || raw?.contentType === null
        ? raw.contentType
        : typeof raw?.mimeType === "string"
          ? raw.mimeType
          : undefined,
  };
}

export async function fetchAdminProfiles({
  search,
  page,
  pageSize = 10,
  sortBy = "createdAt",
  sortDir = "desc",
  banned = "all",
  plan = "all",
}: {
  search: string;
  page: number;
  pageSize?: number;
  sortBy?: "createdAt" | "banned" | "subscriptionPlan";
  sortDir?: "asc" | "desc";
  banned?: "true" | "false" | "all";
  plan?: "all" | "free" | "premium" | "premiumPlus";
}): Promise<{
  profiles: AdminProfile[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: string;
  banned: string;
  plan: string;
}> {
  const headers: Record<string, string> = {
    // Help defeat any intermediate caches
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };
  try {
    const v = Date.now();
    const qs = new URLSearchParams({
      search: search || "",
      page: String(page ?? 1),
      pageSize: String(pageSize ?? 10),
      sortBy,
      sortDir,
      banned,
      plan,
      v: String(v),
    });
    const res = await fetch(`/api/admin/profiles?${qs.toString()}`, {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profiles: ${errorText}`);
    }
    const response = await res.json();

    // Handle the wrapped response format {success: true, data: {...}}
    if (response.success && response.data) {
      return response.data;
    }

    // Fallback for direct data format
    return response;
  } catch (error) {
    throw new Error(
      `Error fetching admin profiles: ${(error as Error).message}`
    );
  }
}

export async function fetchAdminProfileImages({
  userId,
}: {
  userId: string;
}): Promise<{ userProfileImages: ProfileImageInfo[] }> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };
  try {
    const v = Date.now();
    const res = await fetch(`/api/profile-detail/${userId}/images?v=${v}`, {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profile images: ${errorText}`);
    }
    const response = await res.json();

    const payload = response.success && response.data ? response.data : response;
    const rawImages = (payload as any)?.userProfileImages;
    const list = Array.isArray(rawImages) ? rawImages : [];
    return {
      ...(payload as any),
      userProfileImages: list
        .map(normalizeProfileImageInfo)
        .filter((v): v is ProfileImageInfo => !!v),
    };
  } catch (error) {
    throw new Error(
      `Error fetching profile images: ${(error as Error).message}`
    );
  }
}

export async function updateAdminProfile({
  id,
  updates,
}: {
  id: string;
  updates: Partial<Profile>;
}): Promise<AdminProfile> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Cookie-based session; no Authorization header
  };
  try {
    const res = await fetch(`/api/admin/profiles/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates),
      credentials: "include",
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update profile: ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    throw new Error(
      `Error updating admin profile: ${(error as Error).message}`
    );
  }
}

export async function deleteAdminProfile({
  id,
}: {
  id: string;
}): Promise<{ success: boolean; message?: string }> {
  // Try RESTful DELETE to /api/admin/profiles/[id]; if unavailable, fall back to
  // body-based DELETE on /api/admin/profiles with { id }
  const headers: Record<string, string> = {};
  try {
    let res = await fetch(`/api/admin/profiles/${id}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });

    if (!res.ok && (res.status === 404 || res.status === 405)) {
      // Fallback to index route that expects JSON body
      res = await fetch(`/api/admin/profiles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete profile: ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    throw new Error(
      `Error deleting admin profile: ${(error as Error).message}`
    );
  }
}

export async function banAdminProfile({
  id,
  banned,
}: {
  id: string;
  banned: boolean;
}): Promise<{ success: boolean; message?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Cookie-based session; no Authorization header
  };
  try {
    const res = await fetch(`/api/admin/profiles/${id}/ban`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ banned }),
      credentials: "include",
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update ban status: ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    throw new Error(`Error updating ban status: ${(error as Error).message}`);
  }
}

export async function fetchAllAdminProfileImages({
  profiles,
}: {
  profiles: { _id: string; userId: string }[];
}): Promise<Record<string, ProfileImageInfo[]>> {
  if (!profiles || profiles.length === 0) {
    return {};
  }

  // Collect all user IDs for batch request
  const userIds = profiles
    .map((p) => p.userId || p._id)
    .filter(Boolean);

  if (userIds.length === 0) {
    return {};
  }

  try {
    const v = Date.now();
    const res = await fetch(
      `/api/profile-images/batch?userIds=${userIds.join(",")}&v=${v}`,
      {
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
        credentials: "include",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("Batch profile images fetch failed:", await res.text());
      // Return empty arrays for all profiles on error
      return profiles.reduce((acc, p) => {
        acc[p._id] = [];
        return acc;
      }, {} as Record<string, ProfileImageInfo[]>);
    }

    const json = await res.json();
    const batchData = json.data || {};

    // Map the batch response back to profile IDs
    const result: Record<string, ProfileImageInfo[]> = {};
    for (const profile of profiles) {
      const targetId = profile.userId || profile._id;
      const images = batchData[targetId];
      result[profile._id] = Array.isArray(images)
        ? images
            .map(normalizeProfileImageInfo)
            .filter((v: any): v is ProfileImageInfo => !!v)
        : [];
    }

    return result;
  } catch (error) {
    console.error("Error in batch profile images fetch:", error);
    // Return empty arrays for all profiles on error
    return profiles.reduce((acc, p) => {
      acc[p._id] = [];
      return acc;
    }, {} as Record<string, ProfileImageInfo[]>);
  }
}

// Create a new admin profile
export async function createAdminProfile({
  profile,
}: {
  profile: Partial<Profile> & { [key: string]: unknown };
}): Promise<AdminProfile> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Cookie-based session; no Authorization header
  };
  try {
    const res = await fetch(`/api/admin/profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create profile: ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    throw new Error(
      `Error creating admin profile: ${(error as Error).message}`
    );
  }
}

/**
 * Ban or unban a user profile by profileId (admin only)
 * @param token - Admin authentication token
 * @param profileId - The profile's ID
 * @param banned - true to ban, false to unban
 * @returns { success: boolean; error?: string }
 */
export async function setProfileBannedStatus(
  profileId: string,
  banned: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!profileId) return { success: false, error: "No profileId provided" };

  const res = await fetch(`/api/admin/profiles/${profileId}/ban`, {
    method: "PUT",
    headers: {
      // Cookie-based session; no Authorization header
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ banned }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      success: false,
      error: data.error || "Failed to update ban status",
    };
  }
  return { success: true };
}

export type AdminProfileMatchesResult = {
  matches: {
    profileId: string;
    matches: Profile[];
    error?: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
};

export async function fetchAdminAllMatches({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminProfileMatchesResult> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };
  try {
    const v = Date.now();
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      v: String(v),
    });
    const res = await fetch(`/api/admin/matches?${qs.toString()}`, {
      headers,
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch all matches: ${errorText}`);
    }
    const response = await res.json();

    // Handle the wrapped response format {success: true, matches: [...], total, page, pageSize}
    if (response.success) {
      return {
        matches: response.matches || [],
        total: response.total || 0,
        page: response.page || 1,
        pageSize: response.pageSize || 20,
      };
    }

    // Fallback for direct data format
    return {
      matches: response.matches || response || [],
      total: (response.matches || response || []).length,
      page: 1,
      pageSize: 20,
    };
  } catch (error) {
    throw new Error(`Error fetching all matches: ${(error as Error).message}`);
  }
}

// Fetch a single admin profile by ID
export async function fetchAdminProfileById({
  id,
}: {
  id: string;
}): Promise<AdminProfile | null> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };
  try {
    const v = Date.now();
    const res = await fetch(`/api/admin/profiles/${id}?nocache=true&v=${v}`, {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profile: ${errorText}`);
    }
    const json = await res.json();
    // New standardized shape: { success: true, profile, correlationId }
    if (json && typeof json === "object") {
      if (json.profile && json.success) return json.profile as AdminProfile;
      // Legacy / fallback: direct profile object
      if (json._id || json.userId || json.fullName) return json as AdminProfile;
    }
    return null;
  } catch (error) {
    throw new Error(
      `Error fetching admin profile: ${(error as Error).message}`
    );
  }
}

// Update a single admin profile by ID
export async function updateAdminProfileById({
  id,
  updates,
}: {
  id: string;
  updates: Partial<Profile>;
}): Promise<AdminProfile> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Cookie-based session; no Authorization header
  };
  try {
    const res = await fetch(`/api/admin/profiles/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates),
      credentials: "include",
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update profile: ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    throw new Error(
      `Error updating admin profile: ${(error as Error).message}`
    );
  }
}

// Fetch images for a given profileId with admin token
export async function fetchAdminProfileImagesById({
  profileId,
}: {
  profileId: string;
}): Promise<ProfileImageInfo[]> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };
  try {
    const v = Date.now();
    const res = await fetch(`/api/profile-detail/${profileId}/images?v=${v}`, {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profile images: ${errorText}`);
    }
    const data = await res.json();
    // Supported response shapes:
    // 1. Raw array: [ { storageId, url }, ... ] (legacy)
    // 2. Wrapped: { success: true, userProfileImages: [...] }
    // 3. Alternate: { images: [...] }
    const rawList =
      (Array.isArray(data) && data) ||
      (Array.isArray(data.userProfileImages) && data.userProfileImages) ||
      (Array.isArray(data.images) && data.images) ||
      [];

    return rawList
      .map(normalizeProfileImageInfo)
      .filter((v: ProfileImageInfo | null): v is ProfileImageInfo => !!v);
  } catch (error) {
    throw new Error(
      `Error fetching profile images: ${(error as Error).message}`
    );
  }
}

// Update a profile image by imageId for a given profileId (admin)
export async function updateAdminProfileImageById({
  profileId,
  imageId,
  updates,
}: {
  profileId: string;
  imageId: string;
  updates: Partial<ProfileImageInfo>;
}): Promise<ProfileImageInfo> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Cookie-based session; no Authorization header
  };
  try {
    const res = await fetch(
      `/api/profile-detail/${profileId}/images/${imageId}`,
      {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify(updates),
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update profile image: ${errorText}`);
    }
    const json = await res.json();
    const normalized = normalizeProfileImageInfo(json);
    if (!normalized)
      throw new Error("Profile image update returned unexpected payload");
    return normalized;
  } catch (error) {
    throw new Error(
      `Error updating profile image: ${(error as Error).message}`
    );
  }
}

// Delete a profile image by imageId for a given profileId (admin)
export async function deleteAdminProfileImageById({
  profileId,
  imageId,
}: {
  profileId: string;
  imageId: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(
      `/api/admin/profiles/${profileId}/images/${imageId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete profile image: ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    throw new Error(
      `Error deleting profile image: ${(error as Error).message}`
    );
  }
}

// Upload a profile image for a given profileId (admin)
export async function adminUploadProfileImage({
  profileId,
  file,
}: {
  profileId: string;
  file: File;
}): Promise<ProfileImageInfo> {
  if (!profileId) throw new Error("Profile ID required");
  if (!file) throw new Error("File required");

  // Use the same multipart endpoint; server associates the upload with the current admin session
  // and then saves metadata for the specified profileId.
  const form = new FormData();
  form.append("image", file, file.name);
  const uploadRes = await fetch(`/api/profile-images/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!uploadRes.ok) {
    const txt = await uploadRes.text().catch(() => "");
    throw new Error(txt || "Failed to upload image");
  }
  const json = (await uploadRes.json().catch(() => ({}))) as {
    imageId?: string;
    url?: string;
  };
  if (!json.imageId) throw new Error("Upload response missing imageId");

  // If server associates the uploaded image to the current user by default,
  // call the admin order or metadata association endpoint as needed.
  // Here we ensure the metadata is saved for the target profile via existing route.
  const metaRes = await fetch(`/api/profile-images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userId: profileId,
      storageId: json.imageId,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  });
  if (!metaRes.ok) {
    const errData = await metaRes.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to save metadata");
  }
  const data = await metaRes.json();
  const normalized = normalizeProfileImageInfo(data);
  if (!normalized)
    throw new Error("Profile image upload returned unexpected payload");
  return normalized;
}

/**
 * Update the order of profile images for an admin profile
 * @param token - Admin authentication token
 * @param profileId - The profile's ID
 * @param imageIds - Array of image IDs in the new order
 * @returns { success: boolean; message?: string }
 */
export async function updateAdminProfileImageOrder({
  profileId,
  imageIds,
}: {
  profileId: string;
  imageIds: string[];
}): Promise<{ success: boolean; message?: string }> {
  if (!profileId) throw new Error("Profile ID required");
  if (!Array.isArray(imageIds)) throw new Error("Image IDs array required");

  const response = await fetch(`/api/profile-images/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // credentials removed; use token-based auth
    body: JSON.stringify({ profileId, imageIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update image order");
  }

  return response.json();
}

export async function createManualMatch({
  fromProfileId,
  toProfileId,
}: {
  fromProfileId: string;
  toProfileId: string;
}): Promise<{ success: boolean; error?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Cookie-based session; no Authorization header
  };
  const res = await fetch(`/api/admin/matches/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fromProfileId, toProfileId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error || "Failed to create match" };
  }
  return { success: true };
}

export async function fetchAdminProfileMatches({
  profileId,
}: {
  profileId: string;
}): Promise<Profile[]> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };
  try {
    // Matches are served via the profile endpoint with a query param
    const v = Date.now();
    const res = await fetch(
      `/api/admin/profiles/${profileId}?matches=true&v=${v}`,
      {
        headers,
        credentials: "include",
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profile matches: ${errorText}`);
    }
    const json = await res.json();
    if (json && typeof json === "object") {
      if (Array.isArray(json.matches)) return json.matches as Profile[];
      if (Array.isArray(json)) return json as Profile[];
    }
    return [];
  } catch (error) {
    throw new Error(
      `Error fetching profile matches: ${(error as Error).message}`
    );
  }
}
