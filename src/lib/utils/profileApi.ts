import { fetchWithFirebaseAuth } from "../api/fetchWithFirebaseAuth";

export async function updateProfile({
  updates,
}: {
  updates: Record<string, unknown>;
}): Promise<void> {
  const res = await fetchWithFirebaseAuth("/api/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to update profile");
  }
}

/**
 * Boost profile using cookie-based auth (no Authorization header).
 * The server reads HttpOnly session cookies and performs the action.
 */
export async function boostProfileCookieAuth(): Promise<{
  boostsRemaining: number;
}> {
  const res = await fetchWithFirebaseAuth("/api/profile/boost", {
    method: "POST",
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}) as any);
  if (!res.ok || (json && json.success === false)) {
    const msg = (json && json.error) || `Failed to boost profile`;
    throw new Error(msg);
  }
  return { boostsRemaining: (json && json.boostsRemaining) ?? 0 };
}

export async function deleteProfile(): Promise<void> {
  const res = await fetchWithFirebaseAuth("/api/profile/delete", {
    method: "DELETE",
    headers: {},
    credentials: "include", // Include cookies in the request
  });
  if (!res.ok) throw new Error("Failed to delete profile");
}

// Record that current user viewed a profile (no error if unauthenticated)
export async function recordProfileView({
  profileId,
}: {
  profileId: string;
}): Promise<void> {
  if (!profileId) return;
  await fetch("/api/profile/view", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profileId }),
  }).catch(() => {});
}

// Fetch list of viewers for the given profile (Premium Plus only)
export type ProfileViewer = {
  userId: string;
  fullName?: string | null;
  profileImageUrls?: string[] | null;
  viewedAt: number;
};

export async function fetchProfileViewers({
  profileId,
  limit,
  offset,
}: {
  profileId: string;
  limit?: number;
  offset?: number;
}): Promise<{ viewers: ProfileViewer[]; total?: number }> {
  const params = new URLSearchParams({ profileId });
  if (typeof limit === "number") params.set("limit", String(limit));
  if (typeof offset === "number") params.set("offset", String(offset));
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
    viewedAt: Number(v?.viewedAt ?? v?.createdAt ?? Date.now()),
  }));
  const total =
    typeof json?.total === "number" ? (json.total as number) : undefined;
  return { viewers: mapped, total };
}

export async function fetchProfileViewersCount(
  profileId: string
): Promise<number> {
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
