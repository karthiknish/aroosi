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
    exportCsv?: boolean;
    maxAudience?: number;
    sendToAll?: boolean;
    sendToAllFromAuth?: boolean;
    params?: Record<string, unknown>;
    abTest?: { subjects: [string, string]; ratio?: number };
    preheader?: string;
    search?: string;
    plan?: string;
    banned?: string;
    // advanced audience filters
    lastActiveDays?: number;
    lastActiveFrom?: number;
    lastActiveTo?: number;
    completionMin?: number;
    completionMax?: number;
    city?: string | string[];
    country?: string | string[];
    createdAtFrom?: number;
    createdAtTo?: number;
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
    const res = await fetchWithFirebaseAuth("/api/admin/marketing-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // CSV export returns text/csv
    if (payload.exportCsv) {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // callers should use exportAudienceCsv for CSV content
      return { success: true, data: null } as any;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
    if ((data as any)?.data?.dryRun) {
      return { success: true, data: (data as any).data } as any;
    }
    showSuccessToast("Campaign started. Emails are being sent.");
    return { success: true, data: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send emails";
    showErrorToast(errorMessage);
    return {
      success: false,
      error: { code: "EMAIL_ERROR", message: errorMessage },
    };
  }
}

// Export a CSV of the targeted audience in dry-run mode
export async function exportAudienceCsv(payload: {
  templateKey?: string;
  subject?: string;
  body?: string;
  params?: Record<string, unknown>;
  search?: string;
  plan?: string;
  banned?: string;
  // filters
  lastActiveDays?: number;
  lastActiveFrom?: number;
  lastActiveTo?: number;
  completionMin?: number;
  completionMax?: number;
  city?: string | string[];
  country?: string | string[];
  createdAtFrom?: number;
  createdAtTo?: number;
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<{ csv: string }>> {
  try {
    const res = await fetchWithFirebaseAuth("/api/admin/marketing-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, dryRun: true, exportCsv: true }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { success: true, data: { csv: text } };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to export CSV";
    showErrorToast(errorMessage);
    return {
      success: false,
      error: { code: "CSV_EXPORT_ERROR", message: errorMessage },
    };
  }
}

// Export a CSV of the targeted audience in dry-run mode
// (removed duplicate exportAudienceCsv definition)

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
    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((raw as any)?.error || `HTTP ${response.status}`);
    }
    // Normalize to always return { data: { templates } }
    let templates =
      (raw as any)?.templates ?? (raw as any)?.data?.templates ?? [];
    // Fallback to registry endpoint if empty
    if (!Array.isArray(templates) || templates.length === 0) {
      const regRes = await fetchWithFirebaseAuth(
        "/api/admin/email/templates/registry",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const reg = await regRes.json().catch(() => ({}));
      if (regRes.ok) {
        const regTemplates =
          (reg as any)?.data?.templates ?? (reg as any)?.templates ?? [];
        if (Array.isArray(regTemplates) && regTemplates.length > 0) {
          templates = regTemplates;
        }
      }
    }
    return { success: true, data: { templates } } as any;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch templates";
    showErrorToast(errorMessage);
    return {
      success: false,
      error: { code: "EMAIL_ERROR", message: errorMessage },
    };
  }
}

export async function previewMarketingEmail(payload: {
  templateKey?: string;
  params?: Record<string, unknown>;
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
    return {
      success: false,
      error: { code: "TEMPLATE_ERROR", message: msg },
    };
  }
}

/**
 * Send a test email to a specific email address for verification
 * @param token JWT session token for authentication
 * @param payload request body containing test email details
 */
export async function sendTestEmail(
  token: string,
  payload: {
    testEmail: string;
    templateKey?: string;
    subject?: string;
    body?: string;
    preheader?: string;
    params?: Record<string, unknown>;
    abTest?: { subjects: [string, string]; ratio?: number };
  }
): Promise<ApiResponse<{ sent: boolean; recipient: string; subject: string }>> {
  try {
    // Validate test email
    if (!payload.testEmail || !payload.testEmail.includes("@")) {
      const errorMessage = "Please provide a valid email address";
      showErrorToast(null, errorMessage);
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: errorMessage },
      };
    }

    const response = await fetchWithFirebaseAuth(
      "/api/admin/marketing-email/test",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Cookie-based session; no Authorization header
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((data as any)?.error || `HTTP ${response.status}`);
    }

    showSuccessToast(`Test email sent to ${payload.testEmail}`);
    return { success: true, data: (data as any).data } as any;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send test email";
    showErrorToast(null, errorMessage);
    return {
      success: false,
      error: { code: "TEST_EMAIL_ERROR", message: errorMessage },
    };
  }
}

/**
 * Get recent marketing email campaigns and their status
 */
export async function getEmailCampaigns(
  token: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<
  ApiResponse<{
    campaigns: Array<{
      id: string;
      status: "completed" | "processing" | "failed";
      templateKey?: string;
      subject?: string;
      totalSent: number;
      createdAt: string;
      completedAt?: string;
    }>;
    total: number;
  }>
> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());

    const response = await fetchWithFirebaseAuth(
      `/api/admin/marketing-email/campaigns?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as any)?.error || `HTTP ${response.status}`);
    }

    return { success: true, data: (data as any).data } as any;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch campaigns";
    showErrorToast(null, errorMessage);
    return {
      success: false,
      error: { code: "CAMPAIGN_ERROR", message: errorMessage },
    };
  }
}

/**
 * Process a small batch of queued emails in the outbox.
 */
export async function processOutboxBatch(
  limit: number = 10
): Promise<ApiResponse<{ processed: number }>> {
  try {
    const response = await fetchWithFirebaseAuth(
      "/api/admin/email/outbox/process",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any)?.error || `HTTP ${response.status}`);
    }
    const data = await response.json().catch(() => ({}));
    return { success: true, data: (data as any).data } as any;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process outbox";
    showErrorToast(null, errorMessage);
    return {
      success: false,
      error: { code: "OUTBOX_ERROR", message: errorMessage },
    } as any;
  }
}

// Builder Presets API
export type BuilderPreset = { id: string; name: string; schema: unknown };

export async function listBuilderPresets(): Promise<
  ApiResponse<{ presets: BuilderPreset[] }>
> {
  try {
    const res = await fetchWithFirebaseAuth(
      "/api/admin/email/builder-presets",
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
    const presets = ((data as any)?.data?.presets ?? []) as BuilderPreset[];
    return { success: true, data: { presets } };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load presets";
    showErrorToast(errorMessage);
    return {
      success: false,
      error: { code: "PRESET_ERROR", message: errorMessage },
    } as any;
  }
}

export async function createBuilderPreset(
  name: string,
  schema: unknown
): Promise<ApiResponse<{ id: string }>> {
  try {
    const res = await fetchWithFirebaseAuth(
      "/api/admin/email/builder-presets",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, schema }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
    return { success: true, data: (data as any).data } as any;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save preset";
    showErrorToast(errorMessage);
    return {
      success: false,
      error: { code: "PRESET_ERROR", message: errorMessage },
    } as any;
  }
}

export async function renameBuilderPreset(
  id: string,
  name: string
): Promise<ApiResponse<{ id: string }>> {
  try {
    const res = await fetchWithFirebaseAuth(
      `/api/admin/email/builder-presets/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
    return { success: true, data: (data as any).data } as any;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to rename preset";
    showErrorToast(errorMessage);
    return {
      success: false,
      error: { code: "PRESET_ERROR", message: errorMessage },
    } as any;
  }
}

export async function deleteBuilderPreset(
  id: string
): Promise<ApiResponse<{ id: string }>> {
  try {
    const res = await fetchWithFirebaseAuth(
      `/api/admin/email/builder-presets/${id}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
    return { success: true, data: (data as any).data } as any;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete preset";
    showErrorToast(errorMessage);
    return {
      success: false,
      error: { code: "PRESET_ERROR", message: errorMessage },
    } as any;
  }
}
