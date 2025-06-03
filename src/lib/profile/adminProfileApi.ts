import { Profile } from "@/types/profile";
import type { ProfileImage } from "./types";

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
}): Promise<{ userProfileImages: ProfileImage[] }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  try {
    const res = await fetch(`/api/profile-detail/${userId}/images`, {
      headers,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profile images: ${errorText}`);
    }
    return await res.json();
  } catch (error) {
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
}): Promise<Record<string, ProfileImage[]>> {
  const newImages: Record<string, ProfileImage[]> = {};
  await Promise.all(
    profiles.map(async (profile) => {
      if (!profile.userId) return;
      try {
        const data = await fetchAdminProfileImages({
          token,
          userId: profile.userId,
        });
        if (Array.isArray(data.userProfileImages)) {
          newImages[profile._id] = data.userProfileImages;
        }
      } catch (error) {
        console.error(
          `Error fetching images for userId ${profile.userId}:`,
          error
        );
        // Optionally log error for each profile, but don't throw to allow others to continue
      }
    })
  );
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
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ banned }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error || "Failed to update ban status" };
  }
  return { success: true };
}
