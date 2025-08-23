/**
 * Stripe API utilities for handling subscription and payment operations
 */

import { showErrorToast, showInfoToast } from "@/lib/ui/toast";

let portalOpenInFlight = false;

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
        // Cookie-based session; no Authorization header
      },
      credentials: "include",
      // Send both planType (legacy) and planId (canonical) plus optional URLs for future-proofing
      body: JSON.stringify({
        planType: request.planType,
        planId: request.planType, // server expects lowercase id (premium | premiumPlus)
        successUrl: request.successUrl,
        cancelUrl: request.cancelUrl,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}) as any);
      if (response.status === 409) {
        const msg: string = errorData.error || "Already subscribed.";
        // Extract plan name if present in error string
        const planMatch = msg.match(/plan:\s*(\w+)/i);
        const planName = planMatch ? planMatch[1] : undefined;
        showInfoToast(
          planName
            ? `You're already on the ${planName} plan. Opening billing portal...`
            : "You already have an active subscription. Opening billing portal..."
        );
        try {
          await openBillingPortal();
        } catch {
          /* handled inside */
        }
        return { success: false, error: "already-subscribed" };
      }
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const raw = await response.json();
    // successResponse wraps inside { success: true, data: {...} }
    const data = raw && raw.success && raw.data ? raw.data : raw;
    return {
      success: true,
      checkoutUrl: data.url,
    };
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";
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
        Accept: "application/json",
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
      error instanceof Error
        ? error.message
        : "Failed to load subscription plans";
    showErrorToast(msg);
    return [];
  }
}

/**
 * Open Stripe Billing Portal
 * POST /api/stripe/portal
 */
export async function openBillingPortal(): Promise<void> {
  if (portalOpenInFlight) {
    showInfoToast("Opening billing portal...");
    return;
  }
  portalOpenInFlight = true;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 400) {
          showInfoToast(
            (err && err.error) ||
              "You don't have a billing profile yet. Choose a plan first."
          );
          if (!window.location.pathname.startsWith("/plans")) {
            window.location.assign("/plans");
          }
          return;
        }
        if (res.status === 503 && attempt < maxAttempts) {
          // Exponential backoff (base 500ms)
          await new Promise((r) =>
            setTimeout(r, 500 * Math.pow(2, attempt - 1))
          );
          continue; // retry
        }
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      // API may return either a bare { url } or wrapped { success: true, data: { url } }
      const raw = (await res.json()) as {
        url?: string;
        data?: { url?: string };
        error?: string;
      };
      const url = raw?.url ?? raw?.data?.url;
      if (typeof url === "string" && url) {
        window.location.assign(url);
        return;
      }
      throw new Error(raw?.error || "No billing portal URL returned");
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error("Failed to open billing portal", error);
        const msg =
          error instanceof Error
            ? error.message
            : "Failed to open billing portal";
        showErrorToast(msg);
      }
    } finally {
      if (attempt === maxAttempts) portalOpenInFlight = false;
    }
  }
}

export async function refreshSubscription(): Promise<{ success: boolean }> {
  try {
    const res = await fetch("/api/subscription/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}) as any);
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    return { success: true };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Failed to refresh subscription";
    showErrorToast(msg);
    return { success: false };
  }
}