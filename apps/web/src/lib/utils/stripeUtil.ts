/**
 * Stripe API utilities for handling subscription and payment operations
 */

import { showErrorToast } from "@/lib/ui/toast";

export interface CheckoutSessionRequest {
  planType: "premium" | "premiumPlus";
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

/**
 * Creates a Stripe checkout session for subscription plans
 */
export async function createCheckoutSession(
  token: string,
  request: CheckoutSessionRequest
): Promise<CheckoutSessionResponse> {
  try {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      checkoutUrl: data.url,
    };
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create checkout session";
    showErrorToast(errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}