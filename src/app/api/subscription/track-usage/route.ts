import {
  convexMutationWithAuth,
  convexQueryWithAuth,
} from "@/lib/convexServer";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import type { NextRequest } from "next/server";

// Cookie-based auth: no bearer tokens

export async function POST(request: NextRequest) {
  try {
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

    // Check if user can use the feature
    const canUse = await convexQueryWithAuth(
      request,
      api.usageTracking.checkActionLimit,
      {
        action: feature,
      }
    );
    if (!canUse.canPerform) {
      return errorResponse("Feature usage limit reached", 403, {
        limit: canUse.limit,
        used: canUse.currentUsage,
        remaining: canUse.remaining,
      });
    }

    // Track the usage
    await convexMutationWithAuth(request, api.usageTracking.trackUsage, {
      feature,
      metadata,
    } as any);

    // Get updated usage stats
    const stats = await convexQueryWithAuth(
      request,
      api.usageTracking.getUsageStats,
      {}
    );
    type UsageStatItem = {
      feature: string;
      used: number;
      limit: number;
      unlimited?: boolean;
      remaining?: number;
    };
    const featureStats = (stats.usage as UsageStatItem[]).find(
      (u: UsageStatItem) => u.feature === feature
    );

    return successResponse({
      feature,
      plan: stats.plan,
      tracked: true,
      currentUsage: featureStats?.used || 0,
      limit: featureStats?.limit || 0,
      remainingQuota: featureStats?.remaining || 0,
      isUnlimited: featureStats?.unlimited || false,
    });
  } catch (error) {
    console.error("Error tracking feature usage:", error);
    return errorResponse("Failed to track feature usage", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
