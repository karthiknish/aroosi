import type { Profile } from "@/types/profile";
import type { ImageType } from "@/types/image";

type AdminProfile = Profile & { _id: string; userId: string };

export async function fetchAdminProfiles({
  search,
  page,
  pageSize = 10,
}: {
  search: string;
  page: number;
  pageSize?: number;
}): Promise<{ profiles: AdminProfile[]; total: number }> {
  const headers: Record<string, string> = {};
  try {
    const res = await fetch(
      `/api/admin/profiles?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`,
      { headers }
    );
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
}): Promise<{ userProfileImages: ImageType[] }> {
  const headers: Record<string, string> = {};
  try {
    const res = await fetch(`/api/profile-detail/${userId}/images`, {
      headers,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profile images: ${errorText}`);
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
  const headers: Record<string, string> = {};
  try {
    const res = await fetch(`/api/admin/profiles/${id}`, {
      method: "DELETE",
      headers,
    });
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
}): Promise<Record<string, ImageType[]>> {
  const newImages: Record<string, ImageType[]> = {};
  await Promise.all(
    profiles.map(async (profile) => {
      if (!profile.userId) {
        return;
      }
      try {
        const data = await fetchAdminProfileImages({ userId: profile.userId });
        if (Array.isArray(data)) {
          newImages[profile._id] = data;
        } else if (Array.isArray(data.userProfileImages)) {
          newImages[profile._id] = data.userProfileImages;
        } else {
        }
      } catch (error) {
        // Optionally log error for each profile, but don't throw to allow others to continue
      }
    })
  );
  return newImages;
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
  profileId: string;
  matches: Profile[];
  error?: string;
}[];

export async function fetchAdminAllMatches(): Promise<AdminProfileMatchesResult> {
  const headers: Record<string, string> = {};
  try {
    const res = await fetch(`/api/admin/matches`, { headers });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch all matches: ${errorText}`);
    }
    const response = await res.json();

    // Handle the wrapped response format {success: true, matches: [...]}
    if (response.success && response.matches) {
      return response.matches;
    }

    // Fallback for direct data format
    return response.matches || response || [];
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
  const headers: Record<string, string> = {};
  try {
    const res = await fetch(`/api/admin/profiles/${id}`, { headers });
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
}): Promise<ImageType[]> {
  const headers: Record<string, string> = {};
  try {
    const res = await fetch(`/api/profile-detail/${profileId}/images`, {
      headers,
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
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.userProfileImages)) return data.userProfileImages;
    if (Array.isArray(data.images)) return data.images;
    return [];
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
  updates: Partial<ImageType>;
}): Promise<ImageType> {
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
        body: JSON.stringify(updates),
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update profile image: ${errorText}`);
    }
    return await res.json();
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Cookie-based session; no Authorization header
  };
  try {
    const res = await fetch(`/api/profile-images`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ userId: profileId, imageId }),
    });
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
}): Promise<ImageType> {
  if (!profileId) throw new Error("Profile ID required");
  if (!file) throw new Error("File required");

  // Use the same multipart endpoint; server associates the upload with the current admin session
  // and then saves metadata for the specified profileId.
  const form = new FormData();
  form.append("image", file, file.name);
  const uploadRes = await fetch(`/api/profile-images/upload`, {
    method: "POST",
    body: form,
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
  return data as ImageType;
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
  const headers: Record<string, string> = {};
  try {
    const res = await fetch(`/api/admin/profiles/${profileId}/matches`, {
      headers,
    });
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
