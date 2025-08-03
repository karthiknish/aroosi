import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

/**
 * Normalize subscription status response and avoid wrappers that might cause 404/rewrites.
 * Accepts optional query params: profileId, userId
 * Resolves current user profile server-side when neither is provided.
 */
export async function GET(request: NextRequest) {
  const json = (data: unknown, status = 200) =>
    new NextResponse(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");
    const userIdParam = searchParams.get("userId");

    // Convex client (no setAuth; app-layer auth only)
    const { getConvexClient } = await import("@/lib/convexClient");
    const client = getConvexClient();
    if (!client)
      return json(
        { success: false, error: "Convex backend not configured" },
        500
      );

    let profile: unknown = null;

    if (profileId) {
      profile = await client.query(api.users.getProfile, {
        id: profileId as Id<"profiles">,
      });
    } else if (userIdParam) {
      profile = await client.query(api.profiles.getProfileByUserId, {
        userId: userIdParam as Id<"users">,
      });
    } else {
      // Resolve from current server-side context
      const current = await client.query(
        api.users.getCurrentUserWithProfile,
        {}
      );
      profile = (current as { profile?: unknown } | null)?.profile ?? null;
    }

    if (!profile)
      return json({ success: false, error: "User profile not found" }, 404);

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

    return json(
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
      },
      200
    );
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch subscription status",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
