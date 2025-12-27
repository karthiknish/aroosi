/**
 * Admin Profiles API - Handles admin profile management operations
 */

export interface AdminProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isBanned?: boolean;
  isVerified?: boolean;
  subscriptionPlan?: string;
  createdAt?: string;
  lastActiveAt?: string;
}

class AdminProfilesAPI {
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
   * Get all profiles (paginated)
   */
  async list(limit = 20, offset = 0, search?: string): Promise<{ profiles: AdminProfile[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search) params.set("search", search);
    const res = await this.makeRequest(`/api/admin/profiles?${params.toString()}`);
    return {
      profiles: res.data?.profiles || res.profiles || [],
      total: res.data?.total || res.total || 0,
    };
  }

  /**
   * Get a single profile by ID
   */
  async get(userId: string): Promise<AdminProfile | null> {
    try {
      const res = await this.makeRequest(`/api/admin/profiles/${userId}`);
      return res.data?.profile || res.profile || null;
    } catch {
      return null;
    }
  }

  /**
   * Update a profile
   */
  async update(userId: string, data: Partial<AdminProfile>): Promise<AdminProfile> {
    return this.makeRequest(`/api/admin/profiles/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Ban a user
   */
  async ban(userId: string, reason?: string): Promise<void> {
    return this.makeRequest(`/api/admin/profiles/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Unban a user
   */
  async unban(userId: string): Promise<void> {
    return this.makeRequest(`/api/admin/profiles/${userId}/ban`, {
      method: "DELETE",
    });
  }

  /**
   * Toggle spotlight for a user
   */
  async toggleSpotlight(userId: string, enabled: boolean): Promise<void> {
    return this.makeRequest(`/api/admin/profiles/${userId}/spotlight`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  }

  /**
   * Get user's matches
   */
  async getMatches(userId: string): Promise<any[]> {
    const res = await this.makeRequest(`/api/admin/profiles/${userId}/matches`);
    return res.data?.matches || res.matches || [];
  }

  /**
   * Manage profile images
   */
  async deleteImage(userId: string, imageId: string): Promise<void> {
    return this.makeRequest(`/api/admin/profiles/${userId}/images/${imageId}`, {
      method: "DELETE",
    });
  }

  /**
   * Reorder profile images
   */
  async reorderImages(userId: string, imageIds: string[]): Promise<void> {
    return this.makeRequest(`/api/admin/profiles/${userId}/images/order`, {
      method: "POST",
      body: JSON.stringify({ imageIds }),
    });
  }
}

export const adminProfilesAPI = new AdminProfilesAPI();
