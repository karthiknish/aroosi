/**
 * Contact API - Handles contact form and appeals
 */

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  type?: "general" | "support" | "feedback" | "bug";
}

export interface AppealData {
  email: string;
  reason: string;
  details: string;
}

class ContactAPI {
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

    return payload;
  }

  /**
   * Submit contact form
   */
  async submitContact(data: ContactFormData): Promise<{ success: boolean; message?: string }> {
    return this.makeRequest("/api/contact", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Submit an appeal (e.g., for banned accounts)
   */
  async submitAppeal(data: AppealData): Promise<{ success: boolean; message?: string }> {
    return this.makeRequest("/api/appeals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const contactAPI = new ContactAPI();
