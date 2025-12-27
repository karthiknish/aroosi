/**
 * Admin Email API - Handles admin email management
 */

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "sent";
  sentCount?: number;
  createdAt: string;
  scheduledAt?: string;
}

class AdminEmailAPI {
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

  // Email Templates
  async getTemplates(): Promise<EmailTemplate[]> {
    const res = await this.makeRequest("/api/admin/email/templates");
    return res.data?.templates || res.templates || [];
  }

  async getTemplateRegistry(): Promise<any[]> {
    const res = await this.makeRequest("/api/admin/email/templates/registry");
    return res.data?.templates || res.templates || [];
  }

  // Email Campaigns
  async getCampaigns(): Promise<EmailCampaign[]> {
    const res = await this.makeRequest("/api/admin/marketing-email/campaigns");
    return res.data?.campaigns || res.campaigns || [];
  }

  async getCampaign(campaignId: string): Promise<EmailCampaign | null> {
    try {
      const res = await this.makeRequest(`/api/admin/marketing-email/campaigns/${campaignId}/summary`);
      return res.data?.campaign || res.campaign || null;
    } catch {
      return null;
    }
  }

  async updateCampaignSettings(campaignId: string, settings: any): Promise<void> {
    return this.makeRequest(`/api/admin/marketing-email/campaigns/${campaignId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  async getCampaignEmails(campaignId: string): Promise<any[]> {
    const res = await this.makeRequest(`/api/admin/marketing-email/campaigns/${campaignId}/emails`);
    return res.data?.emails || res.emails || [];
  }

  // Marketing Email
  async sendMarketingEmail(data: any): Promise<any> {
    return this.makeRequest("/api/admin/marketing-email", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async previewEmail(data: any): Promise<string> {
    const res = await this.makeRequest("/api/admin/marketing-email/preview", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data?.html || res.html || "";
  }

  async sendTestEmail(data: any): Promise<void> {
    return this.makeRequest("/api/admin/marketing-email/test", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Outbox
  async processOutbox(): Promise<any> {
    return this.makeRequest("/api/admin/email/outbox/process", {
      method: "POST",
    });
  }

  // Builder Presets
  async getBuilderPresets(): Promise<any[]> {
    const res = await this.makeRequest("/api/admin/email/builder-presets");
    return res.data?.presets || res.presets || [];
  }

  async saveBuilderPreset(preset: any): Promise<any> {
    return this.makeRequest("/api/admin/email/builder-presets", {
      method: "POST",
      body: JSON.stringify(preset),
    });
  }

  async updateBuilderPreset(presetId: string, preset: any): Promise<any> {
    return this.makeRequest(`/api/admin/email/builder-presets/${presetId}`, {
      method: "PATCH",
      body: JSON.stringify(preset),
    });
  }

  async deleteBuilderPreset(presetId: string): Promise<void> {
    return this.makeRequest(`/api/admin/email/builder-presets/${presetId}`, {
      method: "DELETE",
    });
  }

  async getBuilderPresetVersions(presetId: string): Promise<any[]> {
    const res = await this.makeRequest(`/api/admin/email/builder-presets/${presetId}/versions`);
    return res.data?.versions || res.versions || [];
  }

  // Tracking
  async trackOpen(trackingId: string): Promise<void> {
    return this.makeRequest(`/api/admin/email/tracking/open?id=${trackingId}`, {
      method: "GET",
    });
  }

  async trackClick(trackingId: string, url: string): Promise<void> {
    return this.makeRequest(`/api/admin/email/tracking/click?id=${trackingId}&url=${encodeURIComponent(url)}`, {
      method: "GET",
    });
  }
}

export const adminEmailAPI = new AdminEmailAPI();
