import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAdminToken } from "@/app/api/_utils/auth";

export async function POST(request: NextRequest) {
  try {
    const adminCheck = requireAdminToken(request);
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
    const { token } = adminCheck;

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

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
