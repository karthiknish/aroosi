import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { Id } from "@convex/_generated/dataModel";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting based on IP (no user ID dependency)
    const rateLimitResult = checkApiRateLimit(
      `safety_check_block_${request.headers.get("x-forwarded-for") ?? "ip"}`,
      100,
      60000
    );
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const { searchParams } = new URL(request.url);
    const targetProfileId = searchParams.get("profileId");
    const targetUserIdParam = searchParams.get("userId");

    if (!targetProfileId && !targetUserIdParam) {
      return errorResponse("Missing profileId or userId parameter", 400);
    }

    // Fetch current user (authenticated) record with profile
    const currentUser = await fetchQuery(
      api.users.getCurrentUserWithProfile,
      {}
    ).catch(() => null as any);

    if (!currentUser || !currentUser.profile) {
      return errorResponse("Current user profile not found", 404);
    }

    let targetUserId: Id<"users">;
    if (targetProfileId) {
      const targetProfile = await fetchQuery(api.users.getProfile, {
        id: targetProfileId as Id<"profiles">,
      } as any).catch(() => null as any);
      if (!targetProfile) {
        return errorResponse("Target profile not found", 404);
      }
      targetUserId = targetProfile.userId as Id<"users">;
    } else {
      // Treat provided userId as internal Convex user ID
      targetUserId = targetUserIdParam as Id<"users">;
    }

    const blockStatus = await fetchQuery(api.safety.getBlockStatus, {
      blockerUserId: currentUser._id as Id<"users">,
      blockedUserId: targetUserId,
    } as any).catch(() => null as any);

    return successResponse({
      isBlocked: !!blockStatus,
      isBlockedBy: false, // Would need reverse check
      canInteract: !blockStatus,
    });
  } catch (error) {
    // avoid noisy logs in production
    if (process.env.NODE_ENV !== "production") {
      console.warn("Safety check block error");
    }
    return errorResponse("Failed to check block status", 500);
  }
}