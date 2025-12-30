/**
 * Auth API - Handles authentication operations
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
}

class AuthAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
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
        (isJson && payload && ((payload as any).message || (payload as any).error)) ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    // Unwrap standardized { success, data } envelope from API handler
    if (isJson && payload && typeof payload === "object") {
      const maybe = payload as any;
      if ("success" in maybe) {
        if (maybe.success === false) {
          throw new Error(String(maybe.message || maybe.error || "Request failed"));
        }
        if ("data" in maybe) {
          return maybe.data as T;
        }
      }
    }

    return payload as T;
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    return this.makeRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    return this.makeRequest("/api/auth/logout", {
      method: "POST",
    });
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthUser> {
    return this.makeRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get current authenticated user
   */
  async me(): Promise<AuthUser | null> {
    try {
      return await this.makeRequest("/api/auth/me");
    } catch {
      return null;
    }
  }

  /**
   * Send password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    return this.makeRequest("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this.makeRequest("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  /**
   * Change password (for logged-in users)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.makeRequest("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    return this.makeRequest("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  /**
   * Request email verification resend
   */
  async requestVerificationEmail(email: string): Promise<void> {
    return this.makeRequest("/api/auth/verify-email/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Sign in with Google OAuth
   */
  async googleAuth(idToken: string): Promise<AuthUser> {
    return this.makeRequest("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
  }

  /**
   * Delete user account
   */
  async deleteAccount(password?: string): Promise<void> {
    return this.makeRequest("/api/auth/delete-account", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }
}

export const authAPI = new AuthAPI();
