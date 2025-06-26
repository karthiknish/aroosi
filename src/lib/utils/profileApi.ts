export async function updateProfile({
  token,
  updates,
}: {
  token: string;
  updates: Record<string, unknown>;
}): Promise<void> {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to update profile");
  }
}

export async function boostProfile(
  token: string
): Promise<{ boostsRemaining: number }> {
  const res = await fetch("/api/profile/boost", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || "Failed to boost profile");
  }
  return { boostsRemaining: json.boostsRemaining ?? 0 };
}

export async function deleteProfile(token: string): Promise<void> {
  const res = await fetch("/api/profile/delete", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete profile");
}

// Record that current user viewed a profile (no error if unauthenticated)
export async function recordProfileView({
  token,
  profileId,
}: {
  token?: string | null;
  profileId: string;
}): Promise<void> {
  if (!token) return;
  await fetch("/api/profile/view", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ profileId }),
  }).catch(() => {}); // swallow any network errors
}

// Fetch list of viewers for the given profile (Premium Plus only)
export async function fetchProfileViewers({
  token,
  profileId,
}: {
  token: string;
  profileId: string;
}): Promise<unknown[]> {
  const res = await fetch(`/api/profile/view?profileId=${profileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || "Failed to fetch viewers");
  }
  // viewers may be nested under data or viewers key
  return (
    json.viewers ??
    (json.data && (json.data as { viewers?: unknown[] }).viewers) ??
    []
  );
}
