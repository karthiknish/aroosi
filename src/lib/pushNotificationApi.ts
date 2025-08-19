import { ApiResponse } from "@/lib/utils/apiResponse";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { fetchWithFirebaseAuth } from "@/lib/api/fetchWithFirebaseAuth";

export interface PushNotificationPayload {
  title: string;
  message: string;
  url?: string;
  dryRun?: boolean;
  confirm?: boolean;
  audience?: string[] | string;
  maxAudience?: number;
}

/**
 * Send a push notification to all subscribed users via OneSignal.
 * @param payload Notification payload
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<ApiResponse<null>> {
  try {
  const response = await fetchWithFirebaseAuth("/api/admin/push-notification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Cookie-based session; no Authorization header
    },
    body: JSON.stringify(payload),
  });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const provider = (errorData as any)?.providerError;
      const providerMsg =
        provider?.errors?.[0]?.message || provider?.error || provider?.message;
      const msg =
        (errorData as any)?.error ||
        (providerMsg ? `Provider: ${providerMsg}` : undefined) ||
        `HTTP ${response.status}`;
      throw new Error(msg);
    }

    showSuccessToast(
      payload?.dryRun
        ? "Preview generated."
        : "Push notification queued for delivery."
    );
    return { success: true, data: null };
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Failed to send notification";
    showErrorToast(errMsg);
    return { success: false, error: errMsg };
  }
}
