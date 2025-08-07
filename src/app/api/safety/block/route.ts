import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession, devLog } from "@/app/api/_utils/auth";
import { convexMutationWithAuth } from "@/lib/convexServer";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

export async function POST(request: NextRequest) {
  try {
    // Cookie-only authentication with user ID extraction
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    if (!userId) {
      return errorResponse("User ID not found in session", 401);
    }

    // Rate limiting for blocking actions
    const rateLimitResult = checkApiRateLimit(
      `safety_block_${userId}`,
      20,
      60000
    ); // 20 blocks per minute
    if (!rateLimitResult.allowed) {
      return errorResponse(
        "Rate limit exceeded. Please wait before blocking again.",
        429
      );
    }

    const body = await request.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return errorResponse("Missing required field: blockedUserId", 400);
    }

    // Prevent self-blocking
    if (userId === blockedUserId) {
      return errorResponse("Cannot block yourself", 400);
    }

    // Block the user via server-side mutation helper
    await convexMutationWithAuth(request, api.safety.blockUser, {
      blockerUserId: userId as Id<"users">,
      blockedUserId: blockedUserId as Id<"users">,
    } as any);

    return successResponse({
      message: "User blocked successfully",
    });
  } catch (error) {
    devLog("error", "safety.block", "unhandled_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Failed to block user", 500);
  }
}