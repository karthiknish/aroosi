import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSessionFromRequest } from "@/app/api/_utils/authSession";
import { convexQueryWithAuth } from "@/lib/convexServer";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session.ok) return session.errorResponse!;
    
    const history = await convexQueryWithAuth(
      request,
      api.usageTracking.getUsageHistory,
      { limit: 100 }
    );
    
    return successResponse(history);
  } catch (error) {
    console.error("Error fetching usage history:", error);
    return errorResponse("Failed to fetch usage history", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}