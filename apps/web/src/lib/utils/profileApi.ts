/**
 * Profile API utilities - Migrated to use centralized profileAPI
 */
import { profileAPI } from "../api/profile";
import type { ProfileViewer, ViewerFilter } from "@aroosi/shared/types";

export type { ProfileViewer, ViewerFilter };

export async function updateProfile({
  updates,
}: {
  updates: Record<string, unknown>;
}): Promise<void> {
  await profileAPI.updateProfile(updates as any);
}

/**
 * Boost profile using cookie-based auth (no Authorization header).
 * The server reads HttpOnly session cookies and performs the action.
 */
export async function boostProfileCookieAuth(): Promise<{
  boostsRemaining: number;
}> {
  const result = await profileAPI.boost();
  return { boostsRemaining: (result as any).boostsRemaining ?? 0 };
}

export async function deleteProfile(): Promise<void> {
  // Use fetch directly for delete as it requires special handling
  const res = await fetch("/api/user/profile", {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && (res.status === 404 || res.status === 405)) {
    const fallback = await fetch("/api/profile/delete", {
      method: "DELETE",
      credentials: "include",
    });
    if (!fallback.ok) {
      const msg = (await fallback.text().catch(() => "")) || "Failed to delete profile";
      throw new Error(msg);
    }
    return;
  }
  if (!res.ok) {
    const msg = (await res.text().catch(() => "")) || "Failed to delete profile";
    throw new Error(msg);
  }
}

// Record that current user viewed a profile (no error if unauthenticated)
export async function recordProfileView({
  profileId,
}: {
  profileId: string;
}): Promise<void> {
  if (!profileId) return;
  try {
    await profileAPI.trackView(profileId);
  } catch {
    // Silently ignore errors for view tracking
  }
}

export async function fetchProfileViewers({
  profileId,
  limit = 20,
  offset = 0,
  filter,
}: {
  profileId: string;
  limit?: number;
  offset?: number;
  filter?: ViewerFilter;
}): Promise<{ viewers: ProfileViewer[]; total?: number; newCount?: number; hasMore?: boolean }> {
  // Use direct fetch as getViewers doesn't support all filter options yet
  const params = new URLSearchParams({ profileId });
  if (typeof limit === "number") params.set("limit", String(limit));
  if (typeof offset === "number") params.set("offset", String(offset));
  if (filter) params.set("filter", filter);
  
  const res = await fetch(`/api/profile/view?${params.toString()}`, {
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}) as any);
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || "Failed to fetch viewers");
  }
  
  const raw = (json?.viewers ?? json?.data?.viewers ?? []) as any[];
  const mapped: ProfileViewer[] = raw.map((v) => ({
    userId: (v?.viewerId ?? v?.userId ?? v?._id ?? "") as string,
    fullName: (v?.fullName ?? null) as string | null,
    profileImageUrls: (v?.profileImageUrls ?? null) as string[] | null,
    age: (v?.age ?? null) as number | null,
    city: (v?.city ?? null) as string | null,
    viewedAt: Number(v?.viewedAt ?? v?.createdAt ?? Date.now()),
    viewCount: v?.viewCount ?? 1,
    isNew: v?.isNew ?? false,
  }));
  
  const total = typeof json?.total === "number" ? (json.total as number) : undefined;
  const newCount = typeof json?.newCount === "number" ? (json.newCount as number) : undefined;
  const hasMore = json?.hasMore ?? false;
  
  return { viewers: mapped, total, newCount, hasMore };
}

export async function fetchProfileViewersCount(profileId: string): Promise<number> {
  if (!profileId) return 0;
  const params = new URLSearchParams({ profileId, mode: "count" });
  const res = await fetch(`/api/profile/view?${params.toString()}`, {
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}) as any);
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || "Failed to fetch viewers count");
  }
  return Number(json?.count ?? 0);
}

