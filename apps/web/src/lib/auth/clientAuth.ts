// Client-side authentication utility functions

import { postJson } from "@/lib/http/client";
import { showErrorToast } from "@/lib/ui/toast";

export interface EmailVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Request email verification
 */
export async function requestEmailVerification(): Promise<EmailVerificationResult> {
  try {
    const result = await postJson<{
      success?: boolean;
      error?: string;
      message?: string;
    }>("/api/auth/verify-email/request");

    if (!result?.success) {
      return {
        success: false,
        error: result?.error || result?.message || "Failed to send verification email",
      };
    }

    return { success: true };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send verification email";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
