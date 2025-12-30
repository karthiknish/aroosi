/**
 * User API - Handles user-related operations
 */

import { safeRequest } from "@/lib/api/safeRequest";
import { handleError } from "@/lib/utils/errorHandling";

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
  createdAt?: string;
}

class UserAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> =
      options?.headers && !(options.headers instanceof Headers) && !Array.isArray(options.headers)
        ? { ...baseHeaders, ...(options.headers as Record<string, string>) }
        : baseHeaders;

    return safeRequest(
      endpoint,
      {
        method: options?.method || "GET",
        headers,
        body: options?.body,
        credentials: "include",
      },
      {
        timeoutMs: 15_000,
        // Only GET requests will be cached by safeRequest.
        cache: { ttlMs: 2 * 60_000 },
      }
    );
  }

  /**
   * Get current user info
   */
  async me(): Promise<User | null> {
    try {
      const res = await this.makeRequest("/api/profile");
      return res.data || res.profile || res.user || null;
    } catch (err) {
      handleError(err, { scope: "userAPI", action: "me" }, { showToast: false, logError: false });
      return null;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<any> {
    return this.makeRequest("/api/profile");
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Record<string, any>): Promise<any> {
    return this.makeRequest("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete user profile
   */
  async deleteProfile(): Promise<void> {
    return this.makeRequest("/api/profile", {
      method: "DELETE",
    });
  }

  /**
   * Search users (admin)
   */
  async search(query: string, limit = 20): Promise<User[]> {
    const res = await this.makeRequest(`/api/profile/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return res.data?.users || res.users || [];
  }
}

export const userAPI = new UserAPI();
