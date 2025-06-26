import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token } = authCheck;
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);
    
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