import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { getSessionFromRequest } from "@/app/api/_utils/authSession";

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

    let profile: unknown = null;
    if (userIdParam) {
      profile = await convexQueryWithAuth(request, api.profiles.getProfileByUserId, {
        userId: userIdParam as Id<"users">,
      }).catch((e: unknown) => {
        console.error("Subscription status getProfileByUserId error", {
          scope: "subscription.status",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });
    } else {
      const session = await getSessionFromRequest(request);
      if (!session.ok) return session.errorResponse!;
      profile = await convexQueryWithAuth(
        request,
        api.profiles.getProfileByUserId,
        { userId: session.userId as unknown as Id<"users"> }
      ).catch((e: unknown) => {
        console.error("Subscription status getProfileByUserId (session) error", {
          scope: "subscription.status",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });
    }

    if (!profile) {
      console.warn("Subscription status profile not found", {
        scope: "subscription.status",
        type: "profile_not_found",
        correlationId,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return json({ success: false, error: "User profile not found", correlationId }, 404);
    }

    // Narrow profile fields safely
    const p = profile as {
      subscriptionExpiresAt?: number | null;
      subscriptionPlan?: string | null;
      boostsRemaining?: number | null;
      hasSpotlightBadge?: boolean | null;
      spotlightBadgeExpiresAt?: number | null;
    };

    const now = Date.now();
    const expiresAt =
      typeof p.subscriptionExpiresAt === "number"
        ? p.subscriptionExpiresAt
        : null;
    const isActive = expiresAt ? expiresAt > now : false;
    const plan = (p.subscriptionPlan ?? "free") || "free";
    let daysRemaining = 0;
    if (expiresAt && isActive) {
      daysRemaining = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    }

    const response = json(
      {
        success: true,
        plan,
        isActive,
        expiresAt,
        daysRemaining,
        boostsRemaining:
          typeof p.boostsRemaining === "number" ? p.boostsRemaining : 0,
        hasSpotlightBadge: !!p.hasSpotlightBadge,
        spotlightBadgeExpiresAt:
          typeof p.spotlightBadgeExpiresAt === "number"
            ? p.spotlightBadgeExpiresAt
            : null,
        correlationId,
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
    return json(
      {
        success: false,
        error: "Failed to fetch subscription status",
        details: message,
        correlationId,
      },
      500
    );
  }
}
