import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);
    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (!profile) return errorResponse("User profile not found", 404);
    const plan = profile.subscriptionPlan || "free";
    // Get usage statistics based on subscription plan
    const usage = {
      plan,
      messaging: {
        sent: 0,
        received: 0,
        limit: plan === "free" ? 50 : -1, // -1 means unlimited
      },
      profileViews: {
        count: 0,
        limit: plan === "free" ? 10 : -1,
      },
      searches: {
        count: 0,
        limit: plan === "free" ? 20 : -1,
      },
      boosts: {
        used: 0,
        remaining: profile.boostsRemaining || 0,
        monthlyLimit: plan === "premiumPlus" ? 5 : 0,
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
