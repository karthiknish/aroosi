import { ApiResponse } from "@/lib/utils/apiResponse";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

/**
 * Send a marketing email campaign.
 * @param token JWT session token for authentication
 * @param payload request body containing templateKey or custom subject/body
 */
export async function sendMarketingEmail(
  token: string,
  payload: {
    templateKey: string;
    subject?: string;
    body?: string;
    confirm?: boolean;
    dryRun?: boolean;
    maxAudience?: number;
    params?: Record<string, unknown>;
  }
): Promise<ApiResponse<null>> {
  try {
    const response = await fetch("/api/admin/marketing-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Cookie-based session; no Authorization header
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    showSuccessToast("Campaign started. Emails are being sent.");
    return { success: true, data: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send emails";
    showErrorToast(errorMessage);
    return { success: false, error: errorMessage };
  }
}
