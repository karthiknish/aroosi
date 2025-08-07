import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSessionFromRequest } from "@/app/api/_utils/authSession";
import { convexQueryWithAuth } from "@/lib/convexServer";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session.ok) return session.errorResponse!;
    
    const stats = await convexQueryWithAuth(
      request,
      api.usageTracking.getUsageStats,
      {}
    );
    
    // Transform the data to match the expected format
    const usage = {
      plan: stats.plan,
      features: stats.usage.map((feature) => ({
        name: feature.feature,
        used: feature.used,
        limit: feature.limit,
        unlimited: feature.unlimited,
        remaining: feature.remaining,
        percentageUsed: feature.percentageUsed,
      })),
      // Legacy format for backward compatibility
      messaging: {
        sent: stats.usage.find((u) => u.feature === "message_sent")?.used || 0,
        limit:
          stats.usage.find((u) => u.feature === "message_sent")?.limit || 0,
      },
      profileViews: {
        count: stats.usage.find((u) => u.feature === "profile_view")?.used || 0,
        limit:
          stats.usage.find((u) => u.feature === "profile_view")?.limit || 0,
      },
      searches: {
        count:
          stats.usage.find((u) => u.feature === "search_performed")?.used || 0,
        limit:
          stats.usage.find((u) => u.feature === "search_performed")?.limit || 0,
      },
      boosts: {
        used:
          stats.usage.find((u) => u.feature === "profile_boost_used")?.used ||
          0,
        monthlyLimit:
          stats.usage.find((u) => u.feature === "profile_boost_used")?.limit ||
          0,
      },
    };
    
    return successResponse(usage);
  } catch (error) {
    console.error("Error fetching usage statistics:", error);
    return errorResponse("Failed to fetch usage statistics", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
