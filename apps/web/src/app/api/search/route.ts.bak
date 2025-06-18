import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit, logSecurityEvent } from "@/lib/utils/securityHeaders";

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type Gender = "any" | "male" | "female" | "other";

export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`search_${userId}`, 200, 60000); // 200 searches per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    console.log("Setting auth token for Convex");
    convexClient.setAuth(token);

    const { searchParams } = new URL(request.url);
    
    // Input validation and sanitization
    const ukCity = searchParams.get("city")?.trim().replace(/[<>'\"&]/g, '') || undefined;
    
    const ageMinParam = searchParams.get("ageMin");
    const ageMaxParam = searchParams.get("ageMax");
    const pageParam = searchParams.get("page") || "0";
    const pageSizeParam = searchParams.get("pageSize") || "12";
    const preferredGenderParam = searchParams.get("preferredGender");

    // Validate and sanitize age parameters
    let ageMin: number | undefined = undefined;
    let ageMax: number | undefined = undefined;
    
    if (ageMinParam) {
      const parsed = parseInt(ageMinParam);
      if (isNaN(parsed) || parsed < 18 || parsed > 120) {
        return errorResponse("Invalid minimum age", 400);
      }
      ageMin = parsed;
    }
    
    if (ageMaxParam) {
      const parsed = parseInt(ageMaxParam);
      if (isNaN(parsed) || parsed < 18 || parsed > 120) {
        return errorResponse("Invalid maximum age", 400);
      }
      ageMax = parsed;
    }

    // Validate age range
    if (ageMin && ageMax && ageMin > ageMax) {
      return errorResponse("Minimum age cannot be greater than maximum age", 400);
    }

    // Validate preferred gender
    const validGenders: Gender[] = ["any", "male", "female", "other"];
    const preferredGender = preferredGenderParam && validGenders.includes(preferredGenderParam as Gender) 
      ? (preferredGenderParam as Gender) 
      : undefined;

    // Validate pagination parameters
    const page = Math.max(0, Math.min(100, parseInt(pageParam) || 0)); // Limit to 100 pages
    const pageSize = Math.max(1, Math.min(50, parseInt(pageSizeParam) || 12)); // Limit page size to 50

    // Validate city if provided
    if (ukCity && (ukCity.length < 2 || ukCity.length > 50)) {
      return errorResponse("Invalid city parameter", 400);
    }

    console.log("Searching profiles with params:", {
      ukCity,
      ageMin,
      ageMax,
      preferredGender,
      page,
      pageSize,
      userId,
    });

    const result = await convexClient.query(api.users.searchPublicProfiles, {
      ukCity,
      ageMin,
      ageMax,
      preferredGender,
      page,
      pageSize,
    });

    // Validate and sanitize search results
    if (!result || typeof result !== 'object') {
      console.error("Invalid search results from Convex:", result);
      return errorResponse("Search service error", 500);
    }

    // Log search for analytics (without sensitive data)
    console.log(`Profile search by user ${userId}: page=${page}, filters=${JSON.stringify({ ukCity: !!ukCity, ageMin, ageMax, preferredGender })}`);

    return successResponse({
      ...result,
      page,
      pageSize,
      searchParams: {
        ukCity,
        ageMin,
        ageMax,
        preferredGender,
      }
    });

  } catch (error) {
    console.error("Error in search API route:", error);
    
    // Log security event for monitoring
    logSecurityEvent('API_ERROR', { 
      userId, 
      endpoint: 'search',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, request);
    
    // Handle Convex authentication errors
    if (error instanceof Error && 
        (error.message.includes("AUTHENTICATION_ERROR") || 
         error.message.includes("Unauthenticated"))) {
      return errorResponse("Authentication failed. Please log in again.", 401);
    }
    
    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Search service temporarily unavailable';
      
    return errorResponse(errorMessage, 500);
  }
}
