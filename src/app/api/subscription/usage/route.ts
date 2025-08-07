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
    type UsageStatItem = {
      feature: string;
      used: number;
      limit: number;
      unlimited?: boolean;
      remaining?: number;
      percentageUsed?: number;
    };
    const usageList = (stats.usage ?? []) as UsageStatItem[];
    
    // Transform the data to match the expected format
    const usage = {
      plan: stats.plan,
      features: usageList.map((feature) => ({
        name: feature.feature,
        used: feature.used,
        limit: feature.limit,
        unlimited: feature.unlimited,
        remaining: feature.remaining,
        percentageUsed: feature.percentageUsed,
      })),
      // Legacy format for backward compatibility
      messaging: {
        sent:
          usageList.find((u: UsageStatItem) => u.feature === "message_sent")
            ?.used || 0,
        limit:
          usageList.find((u: UsageStatItem) => u.feature === "message_sent")
            ?.limit || 0,
      },
      profileViews: {
        count:
          usageList.find((u: UsageStatItem) => u.feature === "profile_view")
            ?.used || 0,
        limit:
          usageList.find((u: UsageStatItem) => u.feature === "profile_view")
            ?.limit || 0,
      },
      searches: {
        count:
          usageList.find((u: UsageStatItem) => u.feature === "search_performed")
            ?.used || 0,
        limit:
          usageList.find((u: UsageStatItem) => u.feature === "search_performed")
            ?.limit || 0,
      },
      boosts: {
        used:
          usageList.find(
            (u: UsageStatItem) => u.feature === "profile_boost_used"
          )?.used || 0,
        monthlyLimit:
          usageList.find(
            (u: UsageStatItem) => u.feature === "profile_boost_used"
          )?.limit || 0,
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
