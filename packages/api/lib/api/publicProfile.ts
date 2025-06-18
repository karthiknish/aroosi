export async function fetchUserPublicProfile({
  userId,
  token,
}: {
  userId: string;
  token: string;
}) {
  const res = await fetch(`/api/public-profile?userId=${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to fetch profile");
  }
  return json.data as {
    fullName?: string;
    profileImageIds?: string[];
    userId: string;
  };
}
