import { ApiResponse } from "@/lib/utils/apiResponse";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { fetchWithFirebaseAuth } from "@/lib/api/fetchWithFirebaseAuth";

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
    sendToAll?: boolean;
    params?: Record<string, unknown>;
    abTest?: { subjects: [string, string]; ratio?: number };
    preheader?: string;
    search?: string;
    plan?: string;
    banned?: string;
    page?: number;
    pageSize?: number;
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
    const response = await fetchWithFirebaseAuth("/api/admin/marketing-email", {
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

export async function listEmailTemplates(): Promise<
  ApiResponse<{
    templates: Array<{ key: string; label: string; category: string }>;
  }>
> {
  try {
    const response = await fetchWithFirebaseAuth("/api/admin/email/templates", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as any)?.error || `HTTP ${response.status}`);
    }
    return { success: true, data } as any;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch templates";
    showErrorToast(errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function previewMarketingEmail(payload: {
  templateKey?: string;
  params?: { args?: unknown[] };
  preheader?: string;
  subject?: string;
  body?: string;
}): Promise<
  ApiResponse<{
    subject: string;
    html: string;
  }>
> {
  try {
    const response = await fetchWithFirebaseAuth(
      "/api/admin/marketing-email/preview",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error((data as any)?.error || `HTTP ${response.status}`);
    return { success: true, data: (data as any).data } as any;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to preview";
    showErrorToast(msg);
    return { success: false, error: msg };
  }
}
