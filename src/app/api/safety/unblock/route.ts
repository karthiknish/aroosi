import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchMutation } from "convex/nextjs";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const { userId } = await requireAuth(request);

    // Rate limiting for unblocking actions
    const rateLimitResult = checkApiRateLimit(`safety_unblock_${userId}`, 20, 60000); // 20 unblocks per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded. Please wait before unblocking again.", 429);
    }

    const body = await request.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return errorResponse("Missing required field: blockedUserId", 400);
    }

    await fetchMutation(api.users.unblockUser, {
      blockerUserId: userId as Id<"users">,
      blockedUserId: blockedUserId as Id<"users">,
    } as any);

    const res = successResponse({
      message: "User unblocked successfully",
      correlationId,
    });
    console.info("Safety unblock success", {
      scope: "safety.unblock",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return res;

  } catch (error) {
    console.error("Error in safety unblock API:", {
      scope: "safety.unblock",
      type: "unhandled_error",
      message: error instanceof Error ? error.message : String(error),
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return errorResponse("Failed to unblock user", 500);
  }
}