/**
 * Notifications API - Handles notification and push operations
 */
import type { InAppNotification, NotificationSettings } from "@aroosi/shared/types";

// Local aliases for shared types
type Notification = InAppNotification;
export type { Notification, NotificationSettings };

class NotificationsAPI {
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
   * Get all notifications
   */
  async getNotifications(limit = 50): Promise<Notification[]> {
    const res = await this.makeRequest(`/api/notifications?limit=${limit}`);
    return res.data?.notifications || res.notifications || [];
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    return this.makeRequest("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ notificationId, read: true }),
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    return this.makeRequest("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ markAllRead: true }),
    });
  }

  /**
   * Update notification settings
   */
  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    return this.makeRequest("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ settings }),
    });
  }

  /**
   * Register push identifier for current user.
   * The backend accepts either { playerId } (OneSignal) or { token }.
   */
  async registerPushToken(
    args:
      | { playerId: string; deviceType?: "ios" | "android" | "web" }
      | { token: string; deviceType?: "ios" | "android" | "web" }
  ): Promise<void> {
    const deviceType = args.deviceType || "web";
    return this.makeRequest("/api/push/register", {
      method: "POST",
      body: JSON.stringify({ ...args, deviceType }),
    });
  }

  /**
   * Unregister push identifier for current user.
   */
  async unregisterPushToken(args: { playerId: string } | { token: string }): Promise<void> {
    return this.makeRequest("/api/push/register", {
      method: "DELETE",
      body: JSON.stringify(args),
    });
  }
}

export const notificationsAPI = new NotificationsAPI();
