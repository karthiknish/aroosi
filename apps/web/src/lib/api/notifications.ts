/**
 * Notifications API - Handles notification and push operations
 */
import type { InAppNotification, NotificationSettings } from "@aroosi/shared/types";
import { getResponseMessage, isApiEnvelope } from "@/lib/api/safeRequest";

// Local aliases for shared types
type Notification = InAppNotification;
export type { Notification, NotificationSettings };

type NotificationListResponse = {
  notifications?: Notification[];
};

class NotificationsAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (options?.headers) {
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    }

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload: unknown = isJson
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(getResponseMessage(payload) ?? `HTTP ${res.status}`);
    }

    if (isApiEnvelope<T>(payload)) {
      if (payload.success === false) {
        throw new Error(getResponseMessage(payload) ?? "Request failed");
      }

      if ("data" in payload) {
        return payload.data as T;
      }
    }

    return payload as T;
  }

  /**
   * Get all notifications
   */
  async getNotifications(limit = 50): Promise<Notification[]> {
    const res = await this.makeRequest<NotificationListResponse>(`/api/notifications?limit=${limit}`);
    return res.notifications ?? [];
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
