export async function sendInterest(
  token: string,
  fromUserId: string,
  toUserId: string
) {
  const res = await fetch("/api/interests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fromUserId, toUserId }),
  });
  return res.json();
}

export async function removeInterest(
  token: string,
  fromUserId: string,
  toUserId: string
) {
  const res = await fetch("/api/interests", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fromUserId, toUserId }),
  });
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getSentInterests(token: string, _userId?: string) {
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
