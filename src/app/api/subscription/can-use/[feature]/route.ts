import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

/**
 * IMPORTANT:
 * We use app-layer auth. Do NOT pass the app JWT to Convex (no convex.setAuth).
 * Instead, identify the current Convex user via server-side queries and use that identity.
 */

const validFeatures = [
  "message_sent",
  "profile_view",
  "search_performed",
  "interest_sent",
  "profile_boost_used",
  "voice_message_sent",
] as const;

type Feature = (typeof validFeatures)[number];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ feature: string }> }
) {
  try {
    // Require an app-layer user token for gating the endpoint
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;

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

    // App-layer auth: DO NOT call convex.setAuth(token)
    // Resolve Convex identity using server function
    const current = await convex
      .query(api.users.getCurrentUserWithProfile, {})
      .catch(() => null);

    // current is shaped like { user, profile } per server function contract; be defensive on typing
    const userId =
      (current as { user?: { _id?: unknown } } | null)?.user?._id ??
      (current as { _id?: unknown } | null)?._id ??
      null;
  
    if (!userId) {
      return errorResponse("User not found in database", 404);
    }
  
    // Check if user can use the feature using server-enforced identity
    // If your checkActionLimit expects a userId param, add it here.
    const result = await convex.query(api.usageTracking.checkActionLimit, {
      action: feature,
      // userId, // uncomment and type if your Convex function requires it
    });

    return successResponse(result);
  } catch (error) {
    console.error("Error checking feature availability:", error);
    return errorResponse("Failed to check feature availability", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}