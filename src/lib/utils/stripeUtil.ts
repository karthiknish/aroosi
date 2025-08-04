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

export interface NormalizedPlan {
  id: "free" | "premium" | "premiumPlus" | string;
  name: string;
  price: number; // minor units
  currency: string; // e.g. "GBP"
  features: string[];
  popular: boolean;
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
      credentials: "include",
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
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create checkout session";
    showErrorToast(errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Fetch normalized plans from the server
 * GET /api/stripe/plans
 */
export async function getPlans(): Promise<NormalizedPlan[]> {
  try {
    const res = await fetch("/api/stripe/plans", {
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json",
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = (await res.json()) as NormalizedPlan[];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to load subscription plans:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to load subscription plans";
    showErrorToast(msg);
    return [];
  }
}

/**
 * Open Stripe Billing Portal
 * POST /api/stripe/portal
 */
export async function openBillingPortal(): Promise<void> {
  try {
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { url?: string };
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    throw new Error("No billing portal URL returned");
  } catch (error) {
    console.error("Failed to open billing portal:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to open billing portal";
    showErrorToast(msg);
  }
}