import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit, logSecurityEvent } from "@/lib/utils/securityHeaders";

type InterestAction = "send" | "remove";

interface InterestRequest {
  fromUserId: string;
  toUserId: string;
}

async function handleInterestAction(req: NextRequest, action: InterestAction) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting for interest actions
    const rateLimitResult = checkApiRateLimit(
      `interest_${action}_${userId}`, 
      action === "send" ? 50 : 100, // 50 sends or 100 removes per hour
      60000
    );
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Parse request body
    let body: Partial<InterestRequest>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid request body", 400);
    }

    if (!body || typeof body !== "object") {
      return errorResponse("Missing or invalid body", 400);
    }

    // Validate required fields
    const { fromUserId, toUserId } = body;
    if (
      !fromUserId ||
      !toUserId ||
      typeof fromUserId !== "string" ||
      typeof toUserId !== "string"
    ) {
      return errorResponse("Invalid or missing user IDs", 400);
    }

    // Security validation: user can only send interests from their own account
    if (fromUserId !== userId) {
      logSecurityEvent('UNAUTHORIZED_ACCESS', {
        userId,
        attemptedFromUserId: fromUserId,
        action: `interest_${action}`
      }, req);
      return errorResponse("Unauthorized: can only send interests from your own account", 403);
    }

    // Validate user IDs format (basic length/format check)
    if (fromUserId.length < 10 || toUserId.length < 10) {
      return errorResponse("Invalid user ID format", 400);
    }

    // Prevent self-interest (users cannot send interest to themselves)
    if (fromUserId === toUserId) {
      return errorResponse("Cannot send interest to yourself", 400);
    }

    // Initialize Convex client
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return errorResponse("Interest service temporarily unavailable", 503);
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    if (!convex) {
      return errorResponse("Interest service temporarily unavailable", 503);
    }
    
    convex.setAuth(token);

    // Log interest action for monitoring
    console.log(`User ${userId} ${action} interest to ${toUserId}`);

    try {
      const result = await convex.mutation(
        action === "send"
          ? api.interests.sendInterest
          : api.interests.removeInterest,
        {
          fromUserId: fromUserId as Id<"users">,
          toUserId: toUserId as Id<"users">,
        }
      );

      // Validate result
      if (!result || typeof result !== 'object') {
        console.error(`Invalid ${action} interest result:`, result);
        return errorResponse(`Failed to ${action} interest`, 500);
      }

      console.log(`Interest ${action} successful: ${fromUserId} -> ${toUserId}`);
      return successResponse(result);

    } catch (convexErr) {
      console.error(`Error in interest ${action}:`, convexErr);
      
      // Log security event for monitoring
      logSecurityEvent('API_ERROR', {
        userId,
        endpoint: 'interests',
        action,
        error: convexErr instanceof Error ? convexErr.message : 'Unknown error'
      }, req);

      const error = convexErr as Error;
      const isAuthError =
        error.message.includes("Unauthenticated") ||
        error.message.includes("token") ||
        error.message.includes("authentication");

      if (isAuthError) {
        return errorResponse("Authentication failed", 401);
      }

      // Don't expose internal errors in production
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? error.message 
        : `Failed to ${action} interest`;
        
      return errorResponse(errorMessage, 400);
    }
  } catch (error) {
    console.error(`Unexpected error in interest ${action}:`, error);
    
    return errorResponse(
      "Internal server error",
      500
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId: authenticatedUserId } = authCheck;

    // Rate limiting for interest queries
    const rateLimitResult = checkApiRateLimit(`interest_get_${authenticatedUserId}`, 100, 60000); // 100 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Get userId from query string
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return errorResponse("Missing userId parameter", 400);
    }

    // Input validation
    if (typeof userId !== "string" || userId.length < 10) {
      return errorResponse("Invalid userId parameter", 400);
    }

    // Security check: users can only query their own interests
    if (userId !== authenticatedUserId) {
      logSecurityEvent('UNAUTHORIZED_ACCESS', {
        userId: authenticatedUserId,
        attemptedUserId: userId,
        action: 'get_interests'
      }, req);
      return errorResponse("Unauthorized: can only view your own interests", 403);
    }

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return errorResponse("Interest service temporarily unavailable", 503);
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    if (!convex) {
      return errorResponse("Interest service temporarily unavailable", 503);
    }
    
    convex.setAuth(token);

    // Log interest query for monitoring
    console.log(`User ${authenticatedUserId} querying sent interests`);

    const result = await convex.query(api.interests.getSentInterests, {
      userId: userId as Id<"users">,
    });

    // Validate result
    if (!result || (typeof result !== 'object' && !Array.isArray(result))) {
      console.error("Invalid sent interests result:", result);
      return errorResponse("Failed to fetch interests", 500);
    }

    return successResponse(result);

  } catch (error) {
    console.error("Error fetching sent interests:", error);
    
    // Log security event for monitoring
    logSecurityEvent('API_ERROR', {
      userId: req.url.includes('userId=') ? new URL(req.url).searchParams.get('userId') : 'unknown',
      endpoint: 'interests',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, req);

    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Authentication failed", 401);
    }
    
    return errorResponse("Failed to fetch interests", 500);
  }
}

export async function POST(req: NextRequest) {
  return handleInterestAction(req, "send");
}

export async function DELETE(req: NextRequest) {
  return handleInterestAction(req, "remove");
}
