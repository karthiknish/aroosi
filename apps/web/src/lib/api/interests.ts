/**
 * Unified Interests API wrapper (token-based auth).
 * Mirrors the style of subscriptionAPI with a small makeRequest helper.
 */
class InterestsAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
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
      const msg =
        (isJson && payload && (payload as any).error) ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    if (isJson && payload && typeof payload === "object" && "success" in (payload as any) && (payload as any).success === false) {
      throw new Error(String((payload as any).error || "Request failed"));
    }

    return payload;
  }

  /**
   * Send interest to a user
   */
  async send(toUserId: string): Promise<any> {
    return this.makeRequest("/api/interests", {
      method: "POST",
      body: JSON.stringify({ action: "send", toUserId }),
    });
  }

  /**
   * Remove a previously sent interest
   */
  async remove(toUserId: string): Promise<any> {
    return this.makeRequest("/api/interests", {
      method: "POST",
      body: JSON.stringify({ action: "remove", toUserId }),
    });
  }

  /**
   * Get interests sent by the current user
   */
  async getSent(): Promise<any> {
    return this.makeRequest("/api/interests", { method: "GET" });
  }

  /**
   * Get interests received by the current user
   */
  async getReceived(): Promise<any> {
    return this.makeRequest("/api/interests/received", { method: "GET" });
  }

  /**
   * Get interest status with respect to a target user (e.g., sent/received/mutual)
   */
  async getStatus(otherUserId: string): Promise<any> {
    const qs = new URLSearchParams({ targetUserId: otherUserId }).toString();
    return this.makeRequest(`/api/interests/status?${qs}`, { method: "GET" });
  }

  /**
   * Respond to an interest (accept or reject)
   */
  async respond(interestId: string, status: "accepted" | "rejected"): Promise<any> {
    return this.makeRequest("/api/interests", {
      method: "POST",
      body: JSON.stringify({ action: "respond", interestId, status }),
    });
  }
}

export const interestsAPI = new InterestsAPI();