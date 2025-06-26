import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import type { NextRequest } from "next/server";

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1] || null;
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return errorResponse("Unauthorized - No token provided", 401);
    }

    const { feature } = await request.json();
    const validFeatures = [
      "message_sent",
      "profile_view",
      "search_performed",
      "interest_sent",
      "profile_boost_used",
      "voice_message_sent",
    ];
    if (!feature || !validFeatures.includes(feature)) {
      return errorResponse(
        `Invalid feature. Must be one of: ${validFeatures.join(", ")}`,
        400
      );
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

    const userData = await convex.query(
      api.users.getCurrentUserWithProfile,
      {}
    );
    if (!userData || !userData.profile) {
      return errorResponse("User profile not found", 404);
    }

    const profile = userData.profile;
    const plan = profile.subscriptionPlan || "free";

    // Check if user has reached their limit for this feature
    const limits = {
      free: {
        message_sent: 50,
        profile_view: 10,
        search_performed: 20,
        interest_sent: 5,
        profile_boost_used: 0,
        voice_message_sent: 0,
      },
      premium: {
        message_sent: -1, // unlimited
        profile_view: 50,
        search_performed: -1,
        interest_sent: -1,
        profile_boost_used: 0,
        voice_message_sent: 10,
      },
      premiumPlus: {
        message_sent: -1,
        profile_view: -1,
        search_performed: -1,
        interest_sent: -1,
        profile_boost_used: 5,
        voice_message_sent: -1,
      },
    };
    const userLimits = limits[plan as keyof typeof limits];
    const featureLimit = userLimits[feature as keyof typeof userLimits];

    // Mock current usage (in reality, fetch from database)
    const mockCurrentUsage = Math.floor(Math.random() * 20);
    const isUnlimited = featureLimit === -1;
    const remainingQuota = isUnlimited
      ? -1
      : Math.max(0, featureLimit - mockCurrentUsage - 1);

    return successResponse({
      feature,
      plan,
      tracked: true,
      currentUsage: mockCurrentUsage + 1,
      limit: featureLimit,
      remainingQuota,
      isUnlimited,
      resetDate: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      ).getTime(),
    });
  } catch (error) {
    console.error("Error tracking feature usage:", error);
    return errorResponse("Failed to track feature usage", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
