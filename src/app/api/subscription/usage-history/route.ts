import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    // Cookie-only: do not set bearer on client
    
    // Get usage history from Convex
    const history = await convex.query(api.usageTracking.getUsageHistory, {
      limit: 100, // Get last 100 entries
    });
    
    return successResponse(history);
  } catch (error) {
    console.error("Error fetching usage history:", error);
    return errorResponse("Failed to fetch usage history", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}