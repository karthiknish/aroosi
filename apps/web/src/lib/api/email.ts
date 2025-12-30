/**
 * Email API - Handles email-related operations
 */

class EmailAPI {
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

    // Unwrap standardized { success, data } envelope from API handler
    if (isJson && payload && typeof payload === "object") {
      const maybe = payload as any;
      if ("success" in maybe) {
        if (maybe.success === false) {
          throw new Error(String(maybe.message || maybe.error || "Request failed"));
        }
        if ("data" in maybe) {
          return maybe.data;
        }
      }
    }

    return payload;
  }

  /**
   * Unsubscribe from email notifications
   */
  async unsubscribe(token: string, type?: string): Promise<{ success: boolean }> {
    const params = new URLSearchParams({ token });
    if (type) params.set("type", type);
    return this.makeRequest(`/api/email/unsubscribe?${params.toString()}`, {
      method: "POST",
    });
  }

  /**
   * Trigger welcome email (typically called after registration)
   */
  async sendWelcome(): Promise<{ success: boolean }> {
    return this.makeRequest("/api/email/welcome", {
      method: "POST",
    });
  }
}

export const emailAPI = new EmailAPI();
