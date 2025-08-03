import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { convexClientFromRequest } from "@/lib/convexClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");
    const userIdParam = searchParams.get("userId");

    // App-layer auth: do NOT forward app JWT to Convex.
    // Create a plain Convex client without setAuth.
    const { getConvexClient } = await import("@/lib/convexClient");
    const client = getConvexClient();
    if (!client) return errorResponse("Convex backend not configured", 500);

    let profile;
    if (profileId) {
      profile = await client.query(api.users.getProfile, {
        id: profileId as Id<"profiles">,
      });
    } else if (userIdParam) {
      // Lookup profile by userId
      profile = await client.query(api.profiles.getProfileByUserId, {
        userId: userIdParam as Id<"users">,
      });
    } else {
      // Fallback: derive profile from server-side context
      const current = await client.query(
        api.users.getCurrentUserWithProfile,
        {}
      );
      profile = (current as { profile?: unknown } | null)?.profile ?? null;
    }

    if (!profile) return errorResponse("User profile not found", 404);

    // Narrow profile shape safely for type-checking without relying on Convex types
    const p = profile as {
      subscriptionExpiresAt?: number | null;
      subscriptionPlan?: string | null;
      boostsRemaining?: number | null;
      hasSpotlightBadge?: boolean | null;
      spotlightBadgeExpiresAt?: number | null;
    };

    const now = Date.now();
    const expiresAt = typeof p.subscriptionExpiresAt === "number" ? p.subscriptionExpiresAt : null;
    const isActive = expiresAt ? expiresAt > now : false;
    const plan = (p.subscriptionPlan ?? "free") || "free";
    let daysRemaining = 0;
    if (expiresAt && isActive) {
      daysRemaining = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    }

    return successResponse({
      plan,
      isActive,
      expiresAt,
      daysRemaining,
      boostsRemaining: typeof p.boostsRemaining === "number" ? p.boostsRemaining : 0,
      hasSpotlightBadge: !!p.hasSpotlightBadge,
      spotlightBadgeExpiresAt:
        typeof p.spotlightBadgeExpiresAt === "number" ? p.spotlightBadgeExpiresAt : null,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return errorResponse("Failed to fetch subscription status", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
