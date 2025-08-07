import { NextRequest } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function POST(request: NextRequest) {
  try {
    const { role } = await requireAuth(request);
    if ((role || "user") !== "admin") return errorResponse("Unauthorized", 403);

    const url = new URL(request.url);
    const profileId = url.pathname.split("/").slice(-2, -1)[0];
    if (!profileId) return errorResponse("Missing profileId", 400);

    const result = await fetchMutation(api.users.adminGrantSpotlightBadge, {
      profileId: profileId as Id<"profiles">,
      durationDays: 30,
    } as any);
    return successResponse(result);
  } catch (error) {
    console.error("Error spotlighting profile:", error);
    return errorResponse("Failed to spotlight profile", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
