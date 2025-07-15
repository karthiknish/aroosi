import { ApiResponse } from "@/lib/utils/apiResponse";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export interface PushNotificationPayload {
  title: string;
  message: string;
  url?: string;
}

/**
 * Send a push notification to all subscribed users via OneSignal.
 * @param token Admin JWT token
 * @param payload Notification payload
 */
export async function sendPushNotification(
  token: string,
  payload: PushNotificationPayload
): Promise<ApiResponse<null>> {
  try {
    const response = await fetch("/api/admin/push-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    showSuccessToast("Push notification queued for delivery.");
    return { success: true, data: null };
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Failed to send notification";
    showErrorToast(errMsg);
    return { success: false, error: errMsg };
  }
}
