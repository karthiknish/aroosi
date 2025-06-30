import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

const validFeatures = [
  "message_sent",
  "profile_view",
  "search_performed",
  "interest_sent",
  "profile_boost_used",
  "voice_message_sent",
] as const;

type Feature = typeof validFeatures[number];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ feature: string }> }
) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token } = authCheck;
    
    const params = await context.params;
    const feature = params.feature as Feature;
    if (!validFeatures.includes(feature)) {
      return errorResponse(
        `Invalid feature. Must be one of: ${validFeatures.join(", ")}`,
        400
      );
    }
    
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);
    
    // Check if user can use the feature
    const result = await convex.query(api.usageTracking.canUseFeature, { feature });
    
    return successResponse(result);
  } catch (error) {
    console.error("Error checking feature availability:", error);
    return errorResponse("Failed to check feature availability", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}