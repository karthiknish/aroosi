import type { Profile } from "@/types/profile";
import type { ImageType } from "@/types/image";

type AdminProfile = Profile & { _id: string; userId: string };

export async function fetchAdminProfiles({
  token,
  search,
  page,
  pageSize = 10,
}: {
  token: string;
  search: string;
  page: number;
  pageSize?: number;
}): Promise<{ profiles: AdminProfile[]; total: number }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  try {
    const res = await fetch(
      `/api/admin/profiles?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`,
      { headers }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profiles: ${errorText}`);
    }
    const data = await res.json();
    console.log("data:", data);
    return data;
  } catch (error) {
    throw new Error(
      `Error fetching admin profiles: ${(error as Error).message}`
    );
  }
}

export async function fetchAdminProfileImages({
  token,
  userId,
}: {
  token: string;
  userId: string;
}): Promise<{ userProfileImages: ImageType[] }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  try {
    console.log(
      "[fetchAdminProfileImages] Fetching images for userId:",
      userId
    );
    const res = await fetch(`/api/profile-detail/${userId}/images`, {
      headers,
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[fetchAdminProfileImages] Error response:", errorText);
      throw new Error(`Failed to fetch profile images: ${errorText}`);
    }
    const data = await res.json();
    console.log("[fetchAdminProfileImages] Response for", userId, data);
    return data;
  } catch (error) {
    console.error(
      "[fetchAdminProfileImages] Error fetching profile images for",
      userId,
      error
    );
    throw new Error(
      `Error fetching profile images: ${(error as Error).message}`
    );
  }
}

export async function updateAdminProfile({
  token,
  id,
  updates,
}: {
  token: string;
  id: string;
  updates: Partial<Profile>;
}): Promise<AdminProfile> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
  token,
  id,
}: {
  token: string;
  id: string;
}): Promise<{ success: boolean; message?: string }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
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
  token,
  id,
  banned,
}: {
  token: string;
  id: string;
  banned: boolean;
}): Promise<{ success: boolean; message?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
  token,
  profiles,
}: {
  token: string;
  profiles: { _id: string; userId: string }[];
}): Promise<Record<string, ImageType[]>> {
  const newImages: Record<string, ImageType[]> = {};
  await Promise.all(
    profiles.map(async (profile) => {
      if (!profile.userId) {
        console.warn(
          "[fetchAllAdminProfileImages] Missing userId for profile",
          profile
        );
        return;
      }
      try {
        console.log(
          "[fetchAllAdminProfileImages] Fetching images for",
          profile.userId
        );
        const data = await fetchAdminProfileImages({
          token,
          userId: profile.userId,
        });
        console.log(
          "[fetchAllAdminProfileImages] Data for",
          profile.userId,
          data
        );
        if (Array.isArray(data)) {
          newImages[profile._id] = data;
        } else if (Array.isArray(data.userProfileImages)) {
          newImages[profile._id] = data.userProfileImages;
        } else {
          console.warn(
            "[fetchAllAdminProfileImages] No images array for",
            profile.userId,
            data
          );
        }
      } catch (error) {
        console.error(
          `[fetchAllAdminProfileImages] Error fetching images for userId ${profile.userId}:`,
          error
        );
        // Optionally log error for each profile, but don't throw to allow others to continue
      }
    })
  );
  console.log("[fetchAllAdminProfileImages] Final newImages:", newImages);
  return newImages;
}

// Create a new admin profile
export async function createAdminProfile({
  token,
  profile,
}: {
  token: string;
  profile: Partial<Profile> & { [key: string]: unknown };
}): Promise<AdminProfile> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
  token: string,
  profileId: string,
  banned: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: "No token provided" };
  if (!profileId) return { success: false, error: "No profileId provided" };

  const res = await fetch(`/api/admin/profiles/${profileId}/ban`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
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

export async function fetchAdminAllMatches({
  token,
}: {
  token: string;
}): Promise<AdminProfileMatchesResult> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  try {
    const res = await fetch(`/api/admin/matches`, { headers });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch all matches: ${errorText}`);
    }
    const data = await res.json();
    return data.matches || [];
  } catch (error) {
    throw new Error(`Error fetching all matches: ${(error as Error).message}`);
  }
}

// Fetch a single admin profile by ID
export async function fetchAdminProfileById({
  token,
  id,
}: {
  token: string;
  id: string;
}): Promise<AdminProfile | null> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  try {
    const res = await fetch(`/api/admin/profiles/${id}`, { headers });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profile: ${errorText}`);
    }
    return await res.json();
  } catch (error) {
    throw new Error(
      `Error fetching admin profile: ${(error as Error).message}`
    );
  }
}

// Update a single admin profile by ID
export async function updateAdminProfileById({
  token,
  id,
  updates,
}: {
  token: string;
  id: string;
  updates: Partial<Profile>;
}): Promise<AdminProfile> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
  token,
  profileId,
}: {
  token: string;
  profileId: string;
}): Promise<ImageType[]> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  try {
    const res = await fetch(`/api/profile-detail/${profileId}/images`, {
      headers,
    });
    console.log("res", res);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profile images: ${errorText}`);
    }
    const data = await res.json();
    console.log("data", data);
    return Array.isArray(data)
      ? data
      : Array.isArray(data.images)
        ? data.images
        : [];
  } catch (error) {
    throw new Error(
      `Error fetching profile images: ${(error as Error).message}`
    );
  }
}

// Update a profile image by imageId for a given profileId (admin)
export async function updateAdminProfileImageById({
  token,
  profileId,
  imageId,
  updates,
}: {
  token: string;
  profileId: string;
  imageId: string;
  updates: Partial<ImageType>;
}): Promise<ImageType> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
  token,
  profileId,
  imageId,
}: {
  token: string;
  profileId: string;
  imageId: string;
}): Promise<{ success: boolean; message?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
  token,
  profileId,
  file,
}: {
  token: string;
  profileId: string;
  file: File;
}): Promise<ImageType> {
  if (!token) throw new Error("Authentication required");
  if (!profileId) throw new Error("Profile ID required");
  if (!file) throw new Error("File required");

  // 1) upload URL
  const uploadUrlRes = await fetch(`/api/profile-images/upload-url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!uploadUrlRes.ok) {
    throw new Error("Failed to get upload URL");
  }
  const { uploadUrl } = (await uploadUrlRes.json()) as { uploadUrl: string };
  if (!uploadUrl) throw new Error("Upload URL missing");

  // 2) put file
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error(txt || "Failed to upload to storage");
  }
  const { storageId } = (await putRes.json()) as { storageId: string };
  if (!storageId) throw new Error("storageId missing");

  // 3) save meta
  const metaRes = await fetch(`/api/profile-images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userId: profileId,
      storageId,
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
  token,
  profileId,
  imageIds,
}: {
  token: string;
  profileId: string;
  imageIds: string[];
}): Promise<{ success: boolean; message?: string }> {
  if (!token) throw new Error("Authentication required");
  if (!profileId) throw new Error("Profile ID required");
  if (!Array.isArray(imageIds)) throw new Error("Image IDs array required");

  const response = await fetch(`/api/profile-images/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ profileId, imageIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update image order");
  }

  return response.json();
}

export async function createManualMatch({
  token,
  fromProfileId,
  toProfileId,
}: {
  token: string;
  fromProfileId: string;
  toProfileId: string;
}): Promise<{ success: boolean; error?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
  token,
  profileId,
}: {
  token: string;
  profileId: string;
}): Promise<Profile[]> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const res = await fetch(`/api/admin/profiles/${profileId}/matches`, {
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch matches");
  }
  const data = await res.json();
  return data.matches || [];
}
