import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAdminSession } from "@/app/api/_utils/auth";

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdminSession(request);
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);

    const url = new URL(request.url);
    const profileId = url.pathname.split("/").slice(-2, -1)[0];
    if (!profileId) return errorResponse("Missing profileId", 400);

    const result = await convex.mutation(api.users.adminGrantSpotlightBadge, {
      profileId: profileId as Id<"profiles">,
      durationDays: 30, // Default 30 days
    });
    return successResponse(result);
  } catch (error) {
    console.error("Error spotlighting profile:", error);
    return errorResponse("Failed to spotlight profile", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
