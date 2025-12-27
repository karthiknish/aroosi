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
   * Send push notification
   */
  async send(data: { userIds?: string[]; title: string; body: string; data?: any }): Promise<any> {
    return this.makeRequest("/api/admin/push-notification", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Send test notification
   */
  async sendTest(data: { token: string; title: string; body: string }): Promise<any> {
    return this.makeRequest("/api/admin/push-notification/test-send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get registered devices
   */
  async getDevices(limit = 50, offset = 0): Promise<{ devices: PushDevice[]; total: number }> {
    const res = await this.makeRequest(`/api/admin/push-notification/devices?limit=${limit}&offset=${offset}`);
    return {
      devices: res.data?.devices || res.devices || [],
      total: res.data?.total || res.total || 0,
    };
  }

  /**
   * Get push templates
   */
  async getTemplates(): Promise<PushTemplate[]> {
    const res = await this.makeRequest("/api/admin/push-notification/templates");
    return res.data?.templates || res.templates || [];
  }

  /**
   * Create push template
   */
  async createTemplate(template: Omit<PushTemplate, "id">): Promise<PushTemplate> {
    return this.makeRequest("/api/admin/push-notification/templates", {
      method: "POST",
      body: JSON.stringify(template),
    });
  }

  /**
   * Update push template
   */
  async updateTemplate(templateId: string, template: Partial<PushTemplate>): Promise<PushTemplate> {
    return this.makeRequest(`/api/admin/push-notification/templates/${templateId}`, {
      method: "PATCH",
      body: JSON.stringify(template),
    });
  }

  /**
   * Delete push template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    return this.makeRequest(`/api/admin/push-notification/templates/${templateId}`, {
      method: "DELETE",
    });
  }
}

export const adminPushAPI = new AdminPushAPI();
