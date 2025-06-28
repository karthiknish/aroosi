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

    const client = await convexClientFromRequest(request);
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
      // Fallback: derive profile from authenticated user
      const current = await client.query(
        api.users.getCurrentUserWithProfile,
        {}
      );
      profile = current?.profile ?? null;
    }

    if (!profile) return errorResponse("User profile not found", 404);
    const now = Date.now();
    const isActive = profile.subscriptionExpiresAt
      ? profile.subscriptionExpiresAt > now
      : false;
    const plan = profile.subscriptionPlan || "free";
    let daysRemaining = 0;
    if (profile.subscriptionExpiresAt && isActive) {
      daysRemaining = Math.ceil(
        (profile.subscriptionExpiresAt - now) / (24 * 60 * 60 * 1000)
      );
    }

    return successResponse({
      plan,
      isActive,
      expiresAt: profile.subscriptionExpiresAt,
      daysRemaining,
      boostsRemaining: profile.boostsRemaining || 0,
      hasSpotlightBadge: profile.hasSpotlightBadge || false,
      spotlightBadgeExpiresAt: profile.spotlightBadgeExpiresAt || null,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return errorResponse("Failed to fetch subscription status", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
