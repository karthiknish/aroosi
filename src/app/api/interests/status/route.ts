import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";
import { fetchQuery } from "convex/nextjs";
import { checkApiRateLimit, logSecurityEvent } from "@/lib/utils/securityHeaders";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    if ("errorResponse" in session) {
      return errorResponse("Unauthorized", 401);
    }
    const { userId: authenticatedUserId } = session as unknown as { userId: string };

    // Rate limiting for interest status queries
    const rateLimitResult = checkApiRateLimit(`interest_status_${authenticatedUserId}`, 200, 60000); // 200 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Get parameters from query string
    const { searchParams } = new URL(req.url);
    const fromUserId = searchParams.get("fromUserId");
    const toUserId = searchParams.get("toUserId");

    if (!fromUserId || !toUserId) {
      return errorResponse("Missing fromUserId or toUserId parameters", 400);
    }

    // Input validation
    if (typeof fromUserId !== "string" || fromUserId.length < 10 ||
        typeof toUserId !== "string" || toUserId.length < 10) {
      return errorResponse("Invalid userId parameters", 400);
    }

    // Security check: user can only query interests involving themselves
    if (fromUserId !== authenticatedUserId && toUserId !== authenticatedUserId) {
      logSecurityEvent('UNAUTHORIZED_ACCESS', {
        userId: authenticatedUserId,
        attemptedFromUserId: fromUserId,
        attemptedToUserId: toUserId,
        action: 'get_interest_status'
      }, req);
      return errorResponse("Unauthorized: can only check interest status involving yourself", 403);
    }

    console.log(`User ${authenticatedUserId} checking interest status: ${fromUserId} -> ${toUserId}`);

    const result = await fetchQuery(api.interests.getInterestStatus, {
      fromUserId: fromUserId as Id<"users">,
      toUserId: toUserId as Id<"users">,
    } as any);

    return successResponse({ status: result });

  } catch (error) {
    console.error("Error fetching interest status:", error);
    
    // Log security event for monitoring
    logSecurityEvent('VALIDATION_FAILED', {
      userId: new URL(req.url).searchParams.get('fromUserId') || 'unknown',
      endpoint: 'interests/status',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, req);

    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Authentication failed", 401);
    }
    
    return errorResponse("Failed to fetch interest status", 500);
  }
}