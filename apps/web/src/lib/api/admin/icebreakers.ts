/**
 * Admin Icebreakers API - Handles admin icebreaker management
 */

export interface AdminIcebreaker {
  id: string;
  question: string;
  category?: string;
  isActive: boolean;
  order?: number;
  createdAt: string;
}

class AdminIcebreakersAPI {
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
   * Get all icebreaker questions
   */
  async list(): Promise<AdminIcebreaker[]> {
    const res = await this.makeRequest("/api/admin/icebreakers");
    return res.data?.icebreakers || res.icebreakers || [];
  }

  /**
   * Create a new icebreaker question
   */
  async create(data: { question: string; category?: string }): Promise<AdminIcebreaker> {
    return this.makeRequest("/api/admin/icebreakers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an icebreaker question
   */
  async update(id: string, data: Partial<AdminIcebreaker>): Promise<AdminIcebreaker> {
    return this.makeRequest("/api/admin/icebreakers", {
      method: "PATCH",
      body: JSON.stringify({ id, ...data }),
    });
  }

  /**
   * Delete an icebreaker question
   */
  async delete(id: string): Promise<void> {
    return this.makeRequest("/api/admin/icebreakers", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
  }
}

export const adminIcebreakersAPI = new AdminIcebreakersAPI();
