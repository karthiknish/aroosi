export async function sendInterest(token: string, toUserId: string) {
  const res = await fetch("/api/interests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ toUserId }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody.error || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

export async function removeInterest(token: string, toUserId: string) {
  const res = await fetch("/api/interests", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ toUserId }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody.error || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

export async function getSentInterests(token: string) {
  const res = await fetch(`/api/interests`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function respondToInterest(
  token: string,
  interestId: string,
  status: "accepted" | "rejected"
) {
  const res = await fetch("/api/interests/respond", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ interestId, status }),
  });
  return res.json();
}
