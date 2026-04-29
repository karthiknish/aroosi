/**
 * Unified Interests API wrapper (token-based auth).
 * Mirrors the style of subscriptionAPI with a small makeRequest helper.
 */
type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

class InterestsAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> =
      options?.headers && !(options.headers instanceof Headers) && !Array.isArray(options.headers)
        ? { ...baseHeaders, ...(options.headers as Record<string, string>) }
        : baseHeaders;

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      const payloadMessage =
        isJson && payload && typeof payload === "object"
          ? ((payload as ApiEnvelope<T>).message || (payload as ApiEnvelope<T>).error)
          : undefined;
      const msg =
        payloadMessage ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    // Unwrap standardized { success, data } envelope from API handler
    if (isJson && payload && typeof payload === "object") {
      const maybe = payload as ApiEnvelope<T>;
      if ("success" in maybe) {
        if (maybe.success === false) {
          throw new Error(String(maybe.message || maybe.error || "Request failed"));
        }
        if ("data" in maybe) {
          return maybe.data as T;
        }
      }
    }

    return payload as T;
  }

  /**
   * Send interest to a user
   */
  async send(toUserId: string): Promise<unknown> {
    return this.makeRequest("/api/interests", {
      method: "POST",
      body: JSON.stringify({ action: "send", toUserId }),
    });
  }

  /**
   * Remove a previously sent interest
   */
  async remove(toUserId: string): Promise<unknown> {
    return this.makeRequest("/api/interests", {
      method: "POST",
      body: JSON.stringify({ action: "remove", toUserId }),
    });
  }

  /**
   * Get interests sent by the current user
   */
  async getSent(): Promise<unknown> {
    return this.makeRequest("/api/interests", { method: "GET" });
  }

  /**
   * Get interests received by the current user
   */
  async getReceived(): Promise<unknown> {
    return this.makeRequest("/api/interests?mode=received", { method: "GET" });
  }

  /**
   * Get interest status with respect to a target user (e.g., sent/received/mutual)
   */
  async getStatus(otherUserId: string): Promise<unknown> {
    const qs = new URLSearchParams({ targetUserId: otherUserId }).toString();
    return this.makeRequest(`/api/interests/status?${qs}`, { method: "GET" });
  }

  /**
   * Respond to an interest (accept or reject)
   */
  async respond(interestId: string, status: "accepted" | "rejected"): Promise<unknown> {
    return this.makeRequest(`/api/interests/${encodeURIComponent(interestId)}/respond`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  }
}

export const interestsAPI = new InterestsAPI();