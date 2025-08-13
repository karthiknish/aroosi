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
    templateKey?: string;
    subject?: string;
    body?: string;
    confirm?: boolean;
    dryRun?: boolean;
    maxAudience?: number;
    params?: Record<string, unknown>;
    abTest?: { subjects: [string, string]; ratio?: number };
  }
): Promise<
  ApiResponse<null | {
    dryRun: boolean;
    totalCandidates: number;
    previewCount: number;
    previews: Array<{ email?: string; subject: string }>;
    maxAudience: number;
    actorId: unknown;
    abTest?: { subjects: [string, string]; ratio: number };
  }>
> {
  try {
    const response = await fetch("/api/admin/marketing-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Cookie-based session; no Authorization header
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((data as any)?.error || `HTTP ${response.status}`);
    }

    if ((data as any)?.data?.dryRun) {
      return { success: true, data: (data as any).data } as any;
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
