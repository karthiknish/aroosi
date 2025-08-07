import { NextRequest } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminSession(request);
    if ("errorResponse" in session) return session.errorResponse;

    const url = new URL(request.url);
    const profileId = url.pathname.split("/").slice(-2, -1)[0];
    if (!profileId) return errorResponse("Missing profileId", 400);

    const body = await request.json().catch(() => ({}));
    const hasSpotlightBadge = Boolean(body?.hasSpotlightBadge);
    const durationDays =
      typeof body?.durationDays === "number"
        ? (body.durationDays as number)
        : undefined;

    const result = await fetchMutation(api.users.adminUpdateSpotlightBadge, {
      profileId: profileId as Id<"profiles">,
      hasSpotlightBadge,
      durationDays,
    } as any);
    return successResponse(result);
  } catch (error) {
    devLog("error", "admin.spotlight", "Failed to update spotlight", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Failed to update spotlight", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
