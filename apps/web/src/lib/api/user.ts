/**
 * User API - Handles user-related operations
 */

import { isJsonObject, safeRequest } from "@/lib/api/safeRequest";
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
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (options?.headers) {
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    }

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
      const res = await this.makeRequest<unknown>("/api/profile");
      if (!isJsonObject(res)) {
        return null;
      }

      const profile = res.profile;
      if (isJsonObject(profile)) {
        return profile as User;
      }

      const user = res.user;
      if (isJsonObject(user)) {
        return user as User;
      }

      return res as User;
    } catch (err) {
      handleError(err, { scope: "userAPI", action: "me" }, { showToast: false, logError: false });
      return null;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<unknown> {
    return this.makeRequest("/api/profile");
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Record<string, unknown>): Promise<unknown> {
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
    const res = await this.makeRequest<{ users?: User[] }>(
      `/api/profile/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return res.users ?? [];
  }
}

export const userAPI = new UserAPI();
