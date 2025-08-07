interface SpotlightBadgeResponse {
  hasSpotlightBadge: boolean;
  spotlightBadgeExpiresAt?: number;
  durationDays?: number;
}

interface SpotlightBadgeRequest {
  hasSpotlightBadge: boolean;
  durationDays?: number;
}

export async function updateSpotlightBadge(
  profileId: string,
  request: SpotlightBadgeRequest,
  token?: string
): Promise<SpotlightBadgeResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await fetch(`/api/admin/profiles/${profileId}/spotlight`, {
    method: "PUT",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update spotlight badge: ${errorText}`);
  }

  const data = await response.json();
  // Support wrapped success shape
  if (data && typeof data === "object" && data.success && data.data) {
    return data.data as SpotlightBadgeResponse;
  }
  return data as SpotlightBadgeResponse;
}

export async function grantSpotlightBadge(
  profileId: string,
  durationDays: number = 30,
  token?: string
): Promise<SpotlightBadgeResponse> {
  return updateSpotlightBadge(profileId, {
    hasSpotlightBadge: true,
    durationDays,
  }, token);
}

export async function removeSpotlightBadge(
  profileId: string,
  token?: string
): Promise<SpotlightBadgeResponse> {
  return updateSpotlightBadge(profileId, {
    hasSpotlightBadge: false,
  }, token);
}