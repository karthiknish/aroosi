import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
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
