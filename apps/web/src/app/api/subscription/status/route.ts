import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { normalisePlan } from "@/lib/subscription/planLimits";
import { requireSession } from "@/app/api/_utils/auth";

// Ensure this endpoint is always resolved at runtime in production
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Normalize subscription status response and avoid wrappers that might cause 404/rewrites.
 * Accepts optional query params: profileId, userId
 * Resolves current user profile server-side when neither is provided.
 */
export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const json = (data: unknown, status = 200) =>
    new NextResponse(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let profile: any = null;
    if (userIdParam) {
      try {
        const snap = await db
          .collection(COLLECTIONS.USERS)
          .doc(userIdParam)
          .get();
        profile = snap.exists
          ? { _id: snap.id, ...(snap.data() as any) }
          : null;
      } catch (e) {
        console.error("Subscription status Firestore doc fetch error", {
          scope: "subscription.status",
          type: "firestore_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
      }
    } else {
      const session = await requireSession(request);
      if ("errorResponse" in session) return session.errorResponse;
      try {
        const snap = await db
          .collection(COLLECTIONS.USERS)
          .doc(session.userId)
          .get();
        profile = snap.exists
          ? { _id: snap.id, ...(snap.data() as any) }
          : null;
      } catch (e) {
        console.error(
          "Subscription status Firestore doc fetch (session) error",
          {
            scope: "subscription.status",
            type: "firestore_query_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          }
        );
      }
    }

    if (!profile) {
      // Instead of 404 (which can bubble up as a Next.js not-found), return a safe default
      console.warn(
        "Subscription status profile not found - returning default free plan",
        {
          scope: "subscription.status",
          type: "profile_not_found_default_free",
          correlationId,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
        }
      );
      return successResponse({
        // Canonical new fields
        plan: "free",
        isActive: false,
        expiresAt: null,
        daysRemaining: 0,
        isTrial: false,
        trialEndsAt: null,
        trialDaysRemaining: 0,
        boostsRemaining: 0,
        hasSpotlightBadge: false,
        spotlightBadgeExpiresAt: null,
        correlationId,
        // Legacy compatibility fields expected by older clients
        subscriptionPlan: "free",
        subscriptionExpiresAt: null,
      });
    }

    // Narrow profile fields safely
    const p = profile as {
      subscriptionExpiresAt?: number | null;
      subscriptionPlan?: string | null;
      boostsRemaining?: number | null;
      hasSpotlightBadge?: boolean | null;
      spotlightBadgeExpiresAt?: number | null;
      subscriptionCancelAtPeriodEnd?: boolean | null;
    };

    const now = Date.now();
    const expiresAt =
      typeof p.subscriptionExpiresAt === "number"
        ? p.subscriptionExpiresAt
        : null;
    const isActive = expiresAt ? expiresAt > now : false;
    const rawPlan = (p.subscriptionPlan ?? "free") || "free";
    const plan = normalisePlan(rawPlan);
    let daysRemaining = 0;
    if (expiresAt && isActive) {
      daysRemaining = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    }

    // Optional: trial fields (derive or extend when available)
    // For now, infer trial as active free plan with a future expiresAtTrial
    const trialEndsAt = null as number | null; // placeholder until supported server-side
    const isTrial =
      plan === "free" && Boolean(trialEndsAt && trialEndsAt > now);
    const trialDaysRemaining =
      isTrial && trialEndsAt
        ? Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000))
        : 0;

    const response = successResponse(
      {
        plan,
        isActive,
        expiresAt,
        daysRemaining,
        cancelAtPeriodEnd: Boolean(p.subscriptionCancelAtPeriodEnd),
        isTrial,
        trialEndsAt,
        trialDaysRemaining,
        boostsRemaining:
          typeof p.boostsRemaining === "number" ? p.boostsRemaining : 0,
        hasSpotlightBadge: !!p.hasSpotlightBadge,
        spotlightBadgeExpiresAt:
          typeof p.spotlightBadgeExpiresAt === "number"
            ? p.spotlightBadgeExpiresAt
            : null,
        correlationId,
        // Legacy compatibility
        subscriptionPlan: plan,
        subscriptionExpiresAt: expiresAt,
      },
      200
    );

    console.info("Subscription status success", {
      scope: "subscription.status",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Subscription status unhandled error", {
      scope: "subscription.status",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return errorResponse("Failed to fetch subscription status", 500, {
      details: message,
      correlationId,
    });
  }
}
