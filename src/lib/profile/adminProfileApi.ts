import { Profile } from "@/types/profile";
import type { ProfileImage } from "./types";

export async function fetchAdminProfiles(
  token: string,
  search: string,
  page: number
) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const res = await fetch(
    `/api/admin/profiles?search=${encodeURIComponent(search)}&page=${page}&pageSize=10`,
    { headers }
  );
  if (!res.ok) throw new Error("Failed to fetch profiles");
  return res.json();
}

export async function fetchAdminProfileImages(token: string, userId: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const res = await fetch(`/api/profile-detail/${userId}/images`, { headers });
  if (!res.ok) throw new Error("Failed to fetch profile images");
  return res.json();
}

export async function updateAdminProfile(
  token: string,
  id: string,
  updates: Partial<Profile>
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(`/api/admin/profiles/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function deleteAdminProfile(token: string, id: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const res = await fetch(`/api/admin/profiles/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete profile");
  return res.json();
}

export async function banAdminProfile(
  token: string,
  id: string,
  banned: boolean
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(`/api/admin/profiles/${id}/ban`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ banned }),
  });
  if (!res.ok) throw new Error("Failed to update ban status");
  return res.json();
}

export async function fetchAllAdminProfileImages(
  token: string,
  profiles: { _id: string; userId: string }[]
) {
  const newImages: Record<string, ProfileImage[]> = {};
  await Promise.all(
    profiles.map(async (profile) => {
      if (!profile.userId) return;
      try {
        const data = await fetchAdminProfileImages(token, profile.userId);
        if (Array.isArray(data.userProfileImages)) {
          newImages[profile._id as string] = data.userProfileImages;
        }
      } catch {}
    })
  );
  return newImages;
}
