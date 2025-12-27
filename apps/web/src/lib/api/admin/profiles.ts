import type { Profile, ProfileImageInfo } from "@aroosi/shared/types";

export interface AdminProfile extends Profile {
  _id: string;
}

class AdminProfilesAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
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
      cache: "no-store",
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
  async list(params: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: string;
    banned?: string;
    plan?: string;
  }): Promise<{
    profiles: AdminProfile[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params.sortBy) qs.set("sortBy", params.sortBy);
    if (params.sortDir) qs.set("sortDir", params.sortDir);
    if (params.banned) qs.set("banned", params.banned);
    if (params.plan) qs.set("plan", params.plan);
    qs.set("v", String(Date.now()));

    const res = await this.makeRequest(`/api/admin/profiles?${qs.toString()}`);
    
    if (res.success && res.data) {
      return res.data;
    }
    return res;
  }

  /**
   * Get a single profile by ID
   */
  async get(id: string): Promise<AdminProfile | null> {
    try {
      const res = await this.makeRequest(`/api/admin/profiles/${id}?nocache=true&v=${Date.now()}`);
      if (res.success && res.profile) return res.profile;
      if (res._id || res.userId) return res;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create a new profile
   */
  async create(profile: Partial<Profile>): Promise<AdminProfile> {
    return this.makeRequest("/api/admin/profiles", {
      method: "POST",
      body: JSON.stringify(profile),
    });
  }

  /**
   * Update a profile
   */
  async update(id: string, updates: Partial<Profile>): Promise<AdminProfile> {
    return this.makeRequest(`/api/admin/profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a profile
   */
  async delete(id: string): Promise<{ success: boolean }> {
    try {
      return await this.makeRequest(`/api/admin/profiles/${id}`, {
        method: "DELETE",
      });
    } catch (e) {
      // Fallback to index route if needed
      return this.makeRequest("/api/admin/profiles", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
    }
  }

  /**
   * Ban/Unban a user
   */
  async setBannedStatus(id: string, banned: boolean): Promise<{ success: boolean }> {
    return this.makeRequest(`/api/admin/profiles/${id}/ban`, {
      method: "PUT",
      body: JSON.stringify({ banned }),
    });
  }

  /**
   * Batch fetch profile images
   */
  async batchFetchImages(profiles: { _id: string; userId: string }[]): Promise<Record<string, ProfileImageInfo[]>> {
    if (!profiles || profiles.length === 0) return {};
    
    const userIds = profiles.map(p => p.userId || p._id).filter(Boolean);
    if (userIds.length === 0) return {};

    try {
      const res = await this.makeRequest(`/api/profile-images/batch?userIds=${userIds.join(",")}&v=${Date.now()}`);
      const batchData = res.data || {};
      
      const result: Record<string, ProfileImageInfo[]> = {};
      for (const profile of profiles) {
        const targetId = profile.userId || profile._id;
        result[profile._id] = batchData[targetId] || [];
      }
      return result;
    } catch (error) {
      console.error("Error in batch profile images fetch:", error);
      return profiles.reduce((acc, p) => {
        acc[p._id] = [];
        return acc;
      }, {} as Record<string, ProfileImageInfo[]>);
    }
  }

  /**
   * Get user's matches
   */
  async getMatches(id: string): Promise<Profile[]> {
    const res = await this.makeRequest(`/api/admin/profiles/${id}?matches=true&v=${Date.now()}`);
    if (Array.isArray(res.matches)) return res.matches;
    if (Array.isArray(res)) return res;
    return [];
  }

  /**
   * Get profile images for a single user
   */
  async getImages(id: string): Promise<ProfileImageInfo[]> {
    const res = await this.batchFetchImages([{ _id: id, userId: id }]);
    return res[id] || [];
  }

  /**
   * Upload a profile image for a user
   */
  async uploadImage(profileId: string, file: File): Promise<ProfileImageInfo> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`/api/profile-images/upload?profileId=${encodeURIComponent(profileId)}`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to upload image: ${errorText}`);
    }

    const data = await res.json();
    return data.data || data;
  }

  /**
   * Delete a profile image
   */
  async deleteImage(profileId: string, imageId: string): Promise<void> {
    const res = await fetch(`/api/admin/profiles/${profileId}/images/${imageId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete image: ${errorText}`);
    }
  }

  /**
   * Update profile image order
   */
  async updateImageOrder(profileId: string, imageIds: string[]): Promise<void> {
    await this.makeRequest(`/api/admin/profiles/${profileId}/images/order`, {
      method: "POST",
      body: JSON.stringify({ imageIds }),
    });
  }

  /**
   * Update spotlight badge for a profile
   */
  async updateSpotlight(profileId: string, request: { hasSpotlightBadge: boolean; durationDays?: number }): Promise<any> {
    return this.makeRequest(`/api/admin/profiles/${profileId}/spotlight`, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  }
}

export const adminProfilesAPI = new AdminProfilesAPI();
