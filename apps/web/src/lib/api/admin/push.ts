/**
 * Admin Push Notifications API - Handles admin push notification management
 */

export interface PushDevice {
  id: string;
  userId: string;
  token: string;
  platform: "ios" | "android" | "web";
  isActive: boolean;
  createdAt: string;
}

export interface PushTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

class AdminPushAPI {
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
   * Send push notification (or preview)
   */
  async send(payload: any): Promise<any> {
    return this.makeRequest("/api/admin/push-notification", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send test notification
   */
  async sendTest(payload: any): Promise<any> {
    return this.makeRequest("/api/admin/push-notification/test-send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get registered devices
   */
  async getDevices(params: { search?: string; page?: number; pageSize?: number } = {}): Promise<{ devices: any[]; total: number }> {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", String(params.page));
    if (params.pageSize) query.append("pageSize", String(params.pageSize));
    
    const res = await this.makeRequest(`/api/admin/push-notification/devices?${query.toString()}`);
    return {
      devices: res.data?.items || res.data?.devices || res.items || res.devices || [],
      total: res.data?.total || res.total || 0,
    };
  }

  /**
   * Get push analytics
   */
  async getAnalytics(): Promise<any> {
    const res = await this.makeRequest("/api/admin/push-notification/analytics");
    return res.data || res;
  }

  /**
   * Get push templates
   */
  async getTemplates(search?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (search) query.append("search", search);
    const res = await this.makeRequest(`/api/admin/push-notification/templates?${query.toString()}`);
    return res.data?.items || res.data?.templates || res.items || res.templates || [];
  }

  /**
   * Create push template
   */
  async createTemplate(template: any): Promise<any> {
    return this.makeRequest("/api/admin/push-notification/templates", {
      method: "POST",
      body: JSON.stringify(template),
    });
  }

  /**
   * Update push template
   */
  async updateTemplate(templateId: string, template: any): Promise<any> {
    return this.makeRequest(`/api/admin/push-notification/templates/${templateId}`, {
      method: "PATCH",
      body: JSON.stringify(template),
    });
  }

  /**
   * Delete push template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.makeRequest(`/api/admin/push-notification/templates/${templateId}`, {
      method: "DELETE",
    });
  }
}

export const adminPushAPI = new AdminPushAPI();
