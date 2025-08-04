/**
 * Interests utilities (cookie-based auth).
 * All requests include credentials and rely on HttpOnly session cookies.
 * Provides normalized error handling.
 */

async function parseJsonSafely(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (ct.toLowerCase().includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }
  try {
    const text = await res.text();
    return text ? { message: text } : {};
  } catch {
    return {};
  }
}

function ensureOk(json: any, res: Response, fallbackMsg: string) {
  if (!res.ok || (json && json.success === false)) {
    const msg =
      (json && (json.error as string)) ||
      (json && (json.message as string)) ||
      `${fallbackMsg} (HTTP ${res.status})`;
    throw new Error(msg);
  }
}

/**
 * Send interest to a user (cookie session)
 */
export async function sendInterestCookie(toUserId: string): Promise<any> {
  const res = await fetch("/api/interests", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ toUserId }),
    redirect: "manual",
  });
  const json = await parseJsonSafely(res);
  ensureOk(json, res, "Failed to send interest");
  return json;
}

/**
 * Remove previously sent interest (cookie session)
 */
export async function removeInterestCookie(toUserId: string): Promise<any> {
  const res = await fetch("/api/interests", {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ toUserId }),
    redirect: "manual",
  });
  const json = await parseJsonSafely(res);
  ensureOk(json, res, "Failed to remove interest");
  return json;
}

/**
 * Get interests sent by current user (cookie session)
 */
export async function getSentInterestsCookie(): Promise<any> {
  const res = await fetch(`/api/interests`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    redirect: "manual",
  });
  const json = await parseJsonSafely(res);
  ensureOk(json, res, "Failed to fetch sent interests");
  return json;
}

/**
 * Respond to an interest (accept/reject) (cookie session)
 */
export async function respondToInterestCookie(
  interestId: string,
  status: "accepted" | "rejected"
): Promise<any> {
  const res = await fetch("/api/interests/respond", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ interestId, status }),
    redirect: "manual",
  });
  const json = await parseJsonSafely(res);
  ensureOk(json, res, "Failed to respond to interest");
  return json;
}
