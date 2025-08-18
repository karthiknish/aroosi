/**
 * Interests utilities (token-based auth).
 * Uses centralized HTTP client which attaches Authorization from tokenStorage
 * and handles single-refresh-on-401 automatically.
 */
import { getJson, postJson, deleteJson } from "@/lib/http/client";

// normalizeError helper removed (unused)

/**
 * Send interest to a user (token-based)
 */
export async function sendInterest(toUserId: string): Promise<any> {
  try {
    const res = await postJson<any>(
      "/api/interests",
      { action: "send", toUserId },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-client-check": "interest-send",
        },
        cache: "no-store",
      }
    );
    if (
      res &&
      typeof res === "object" &&
      "success" in res &&
      (res as any).success === false
    ) {
      throw new Error((res as any).error || "Failed to send interest");
    }
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send interest";
    throw new Error(msg);
  }
}

/**
 * Remove previously sent interest (token-based)
 */
export async function removeInterest(toUserId: string): Promise<any> {
  try {
    return await postJson<any>(
      "/api/interests",
      { action: "remove", toUserId },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-client-check": "interest-remove",
        },
        cache: "no-store",
      }
    );
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to remove interest";
    throw new Error(msg);
  }
}

/**
 * Get interests sent by current user (token-based)
 */
export async function getSentInterests(): Promise<any> {
  try {
    return await getJson<any>("/api/interests", {
      headers: {
        Accept: "application/json",
        "x-client-check": "interest-sent",
      },
      cache: "no-store",
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch sent interests";
    throw new Error(msg);
  }
}

/**
 * Respond to an interest (accept/reject) (token-based)
 */
export async function respondToInterest(
  interestId: string,
  status: "accepted" | "rejected"
): Promise<any> {
  try {
    return await postJson<any>(
      "/api/interests",
      { action: "respond", interestId, status },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-client-check": "interest-respond",
        },
        cache: "no-store",
      }
    );
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to respond to interest";
    throw new Error(msg);
  }
}
