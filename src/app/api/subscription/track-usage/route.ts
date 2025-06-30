import { getConvexClient } from "@/lib/convexClient";
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

    const { feature, metadata } = await request.json();
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

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);

    // Check if user can use the feature
    const canUse = await convex.query(api.usageTracking.canUseFeature, { feature });
    if (!canUse.canUse) {
      return errorResponse(canUse.reason || "Feature usage limit reached", 403, {
        limit: canUse.limit,
        used: canUse.used,
        resetDate: canUse.resetDate,
      });
    }

    // Track the usage
    await convex.mutation(api.usageTracking.trackUsage, { feature, metadata });

    // Get updated usage stats
    const stats = await convex.query(api.usageTracking.getUsageStats, {});
    const featureStats = stats.usage.find(u => u.feature === feature);

    return successResponse({
      feature,
      plan: stats.plan,
      tracked: true,
      currentUsage: featureStats?.used || 0,
      limit: featureStats?.limit || 0,
      remainingQuota: featureStats?.remaining || 0,
      isUnlimited: featureStats?.unlimited || false,
      resetDate: stats.resetDate,
    });
  } catch (error) {
    console.error("Error tracking feature usage:", error);
    return errorResponse("Failed to track feature usage", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
