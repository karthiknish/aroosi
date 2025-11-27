import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { stripe } from "@/lib/stripe";
import { requireSession } from "@/app/api/_utils/auth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import {
  checkApiRateLimit,
  logSecurityEvent,
} from "@/lib/utils/securityHeaders";
import { validateSameOriginUrl } from "@/lib/validation/common";

// Shared origin allowlist logic (could be factored to util)
const PORTAL_ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_BASE_URL,
    process.env.VERCEL_URL && !process.env.VERCEL_URL.startsWith("http")
      ? `https://${process.env.VERCEL_URL}`
      : process.env.VERCEL_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]
    .filter(Boolean)
    .map((u) => {
      try { return new URL(u as string).origin; } catch { return null; }
    })
    .filter(Boolean) as string[]
);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try { return PORTAL_ALLOWED_ORIGINS.has(new URL(origin).origin); } catch { return false; }
}

/**
 * POST /api/stripe/portal
 * Creates a Stripe Billing Portal session and returns { url }
 * Requires an authenticated user; looks up their Stripe customer ID via Convex.
 * Env:
 *  - STRIPE_BILLING_PORTAL_RETURN_URL (confirmed https://aroosi.app/plans)
 */
/**
 * Optional JSON body:
 *  {
 *    "returnUrl"?: string   // same-origin override for billing portal return URL
 *  }
 */
export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    // If a static billing portal URL is configured, we can short‑circuit and return it
    // (still performing origin + auth checks so it isn't exposed cross‑origin).
    // This is useful when you intentionally serve a generic portal login page instead of
    // creating per-customer sessions (e.g. when Stripe-hosted email auth is acceptable).
    const staticPortalUrl = process.env.STRIPE_BILLING_PORTAL;

    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    const candidateOrigin =
      originHeader ||
      (refererHeader
        ? (() => {
            try {
              return new URL(refererHeader).origin;
            } catch {
              return null;
            }
          })()
        : null);
    if (!isAllowedOrigin(candidateOrigin)) {
      return errorResponse("Origin not allowed", 403);
    }
    // Require cookie/JWT auth (same pattern as checkout)
    const authSession = await requireSession(req);
    if ("errorResponse" in authSession) return authSession.errorResponse;
    const { userId } = authSession;

    // Lightweight rate limit: 20 portal opens / 5 minutes / user
    const rl = checkApiRateLimit(`stripe_portal_${userId}`, 20, 5 * 60 * 1000);
    if (!rl.allowed) {
      logSecurityEvent(
        "RATE_LIMIT_EXCEEDED",
        { endpoint: "stripe/portal", userId, correlationId },
        req
      );
      return errorResponse("Rate limit exceeded", 429);
    }

    if (!stripe && !staticPortalUrl) {
      // Safety check requested: neither dynamic session creation nor static portal configured
      console.error(
        "Billing portal not configured (no Stripe + no static URL)"
      );
      return errorResponse("Billing portal not configured", 400);
    }
    if (!stripe && staticPortalUrl) {
      // We will return the static URL below after auth & rate limit checks.
    }
    // Derive base app URL (canonical precedence)
    const baseUrl: string =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL?.startsWith("http")
        ? process.env.VERCEL_URL
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://www.aroosi.app");

    // Attempt to read optional body for returnUrl override (ignore parse errors)
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      /* no body */
    }
    const requestedReturnUrl =
      body && typeof body === "object" ? body.returnUrl : undefined;

    const defaultReturn =
      process.env.STRIPE_BILLING_PORTAL_RETURN_URL || `${baseUrl}/plans`;
    const cleanedReturnDefault =
      validateSameOriginUrl(defaultReturn, baseUrl) || `${baseUrl}/plans`;
    const cleanedReturnOverrideRaw =
      typeof requestedReturnUrl === "string"
        ? validateSameOriginUrl(requestedReturnUrl, baseUrl)
        : undefined;
    const ALLOWED_RETURN_PATH_PREFIXES = ["/plans", "/billing"]; // tighten
    const cleanedReturnOverride = (() => {
      if (!cleanedReturnOverrideRaw) return undefined;
      try {
        const u = new URL(cleanedReturnOverrideRaw);
        if (
          !ALLOWED_RETURN_PATH_PREFIXES.some(
            (p) => u.pathname === p || u.pathname.startsWith(p + "/")
          )
        )
          return undefined;
        return u.toString();
      } catch {
        return undefined;
      }
    })();
    const cleanedReturn = cleanedReturnOverride || cleanedReturnDefault;

    // Fetch Stripe related identifiers for this user from Firestore
    let customerId: string | null = null;
    let subscriptionId: string | null = null;
    let subscriptionPlan: string | null = null;
    let subscriptionExpiresAt: number | null = null;
    try {
      const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      if (snap.exists) {
        const data = snap.data() as any;
        customerId =
          data?.stripeCustomerId ||
          data?.billing?.customerId ||
          data?.stripe?.customerId ||
          null;
        subscriptionId = data?.stripeSubscriptionId || null;
        subscriptionPlan = data?.subscriptionPlan || null;
        subscriptionExpiresAt =
          typeof data?.subscriptionExpiresAt === "number"
            ? data.subscriptionExpiresAt
            : null;
      }
    } catch (e) {
      console.warn("Portal route Firestore fetch failed", {
        scope: "stripe.portal",
        userId,
        message: e instanceof Error ? e.message : String(e),
        correlationId,
      });
    }

    // Hydrate missing customerId via subscription lookup if possible
    if (!customerId && subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub && typeof sub.customer === "string") {
          customerId = sub.customer;
          // persist for future fast path
          try {
            await db
              .collection(COLLECTIONS.USERS)
              .doc(userId)
              .set(
                { stripeCustomerId: customerId, updatedAt: Date.now() },
                { merge: true }
              );
          } catch (persistErr) {
            console.warn(
              "Portal route: failed to persist hydrated customerId",
              {
                userId,
                correlationId,
                error:
                  persistErr instanceof Error
                    ? persistErr.message
                    : String(persistErr),
              }
            );
          }
        }
      } catch (subErr) {
        console.warn("Portal route: subscription retrieval failed", {
          userId,
          subscriptionId,
          correlationId,
          error: subErr instanceof Error ? subErr.message : String(subErr),
        });
      }
    }

    // If still no customer id, return clearer guidance
    // We allow proceeding if a static portal URL is configured (generic fallback)
    if ((!customerId || typeof customerId !== "string") && !staticPortalUrl) {
      console.warn("Portal route: missing Stripe customer id", {
        scope: "stripe.portal",
        userId,
        hasSubscriptionId: !!subscriptionId,
        subscriptionPlan,
        correlationId,
      });
      return errorResponse(
        "No billing portal available. Purchase a plan first.",
        400
      );
    }

    // Optional: Validate that subscription (if present) is active/trialing before granting portal.
    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub && !["active", "trialing", "past_due"].includes(sub.status)) {
          // Allow past_due so user can update payment method.
          return errorResponse(
            `Subscription not active (status: ${sub.status}).`,
            409
          );
        }
        // Sync expiration if drift > 60s
        if (
          sub &&
          sub.current_period_end &&
          (typeof subscriptionExpiresAt !== "number" ||
            Math.abs(sub.current_period_end * 1000 - subscriptionExpiresAt) >
              60 * 1000)
        ) {
          try {
            await db
              .collection(COLLECTIONS.USERS)
              .doc(userId)
              .set(
                {
                  subscriptionExpiresAt: sub.current_period_end * 1000,
                  updatedAt: Date.now(),
                },
                { merge: true }
              );
          } catch (syncErr) {
            console.warn("Portal route: failed to sync subscription expiry", {
              userId,
              correlationId,
              error:
                syncErr instanceof Error ? syncErr.message : String(syncErr),
            });
          }
        }
      } catch (subStatusErr) {
        console.warn("Portal route: cannot verify subscription status", {
          userId,
          subscriptionId,
          correlationId,
          error:
            subStatusErr instanceof Error
              ? subStatusErr.message
              : String(subStatusErr),
        });
      }
    }

    // If a static portal URL is provided, return it directly (after customer presence check)
    if (staticPortalUrl) {
      if (!/^https:\/\/billing\.stripe\.com\//.test(staticPortalUrl)) {
        console.error(
          "Configured STRIPE_BILLING_PORTAL does not look like a Stripe billing domain",
          { staticPortalUrl }
        );
        return errorResponse("Billing portal misconfigured", 500);
      }
      console.info("Static Stripe billing portal URL returned", {
        scope: "stripe.portal",
        statusCode: 200,
        userId,
        correlationId,
        durationMs: Date.now() - startedAt,
      });
      return successResponse({ url: staticPortalUrl });
    }

    // Dynamic session creation path (preferred: per-customer session)
    let portalSession;
    try {
      portalSession = await stripe!.billingPortal.sessions.create({
        customer: customerId as string,
        return_url: cleanedReturn,
      });
    } catch (stripeErr: any) {
      const code = stripeErr?.code || stripeErr?.type;
      console.error("Stripe billing portal create error", {
        scope: "stripe.portal",
        userId,
        correlationId,
        code,
        message:
          stripeErr instanceof Error ? stripeErr.message : String(stripeErr),
      });
      if (code === "resource_missing") {
        return errorResponse(
          "Billing portal unavailable (customer not found).",
          404
        );
      }
      if (code === "rate_limit") {
        return errorResponse(
          "Billing service busy, please try again shortly.",
          503
        );
      }
      return errorResponse("Failed to create billing portal session", 500);
    }

    if (!portalSession?.url) {
      console.error("Failed to create Stripe billing portal session");
      return errorResponse("Failed to create billing portal session", 500);
    }

    console.info("Stripe billing portal session created", {
      scope: "stripe.portal",
      statusCode: 200,
      userId,
      correlationId,
      durationMs: Date.now() - startedAt,
    });

    return successResponse({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe portal error", {
      scope: "stripe.portal",
      message: error instanceof Error ? error.message : String(error),
      correlationId,
      durationMs: Date.now() - startedAt,
    });
    return errorResponse("Failed to create billing portal session", 500);
  }
}