/**
 * Admin Contact API - Handles admin contact/email management
 */

export interface Contact {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  createdAt: string;
}

class AdminContactAPI {
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
   * Get contact submissions
   */
  async list(params: { page?: number; pageSize?: number; source?: "aroosi" | "vip" } = {}): Promise<any[]> {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.pageSize) query.append("pageSize", String(params.pageSize));
    if (params.source === "vip") query.append("source", "vip");

    const res = await this.makeRequest(`/api/contact?${query.toString()}`);
    const arr = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];
    return arr.map((c: any) => ({ ...c, id: c.id || c._id || "" }));
  }

  /**
   * General admin email operations
   */
  async getEmails(limit = 50, offset = 0): Promise<{ emails: any[]; total: number }> {
    const res = await this.makeRequest(`/api/admin/email?limit=${limit}&offset=${offset}`);
    return {
      emails: res.data?.emails || res.emails || [],
      total: res.data?.total || res.total || 0,
    };
  }

  /**
   * Process email queue
   */
  async processQueue(): Promise<any> {
    return this.makeRequest("/api/admin/email-queue/process", {
      method: "POST",
    });
  }

  /**
   * Get email templates
   */
  async getEmailTemplates(): Promise<any[]> {
    const res = await this.makeRequest("/api/admin/email-templates");
    return res.data?.templates || res.templates || [];
  }

  /**
   * Get email template by ID
   */
  async getEmailTemplate(templateId: string): Promise<any> {
    return this.makeRequest(`/api/admin/email-templates/${templateId}`);
  }

  /**
   * Preview transactional email
   */
  async previewTransactionalEmail(data: any): Promise<string> {
    const res = await this.makeRequest("/api/admin/transactional-email/preview", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data?.html || res.html || "";
  }
}

export const adminContactAPI = new AdminContactAPI();
