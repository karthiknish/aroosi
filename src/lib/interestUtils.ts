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

export async function getSentInterests(token: string, userId: string) {
  const res = await fetch(
    `/api/interests?userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.json();
}
