import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";

type Gender = "any" | "male" | "female" | "other";

export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Subscription-based rate limiting
    if (!userId) {
      return errorResponse("User ID is required", 400);
    }

    const subscriptionRateLimit =
      await subscriptionRateLimiter.checkSubscriptionRateLimit(
        request,
        token,
        userId,
        "search_performed"
      );

    if (!subscriptionRateLimit.allowed) {
      return errorResponse(
        subscriptionRateLimit.error || "Subscription limit exceeded",
        429
      );
    }

    const convexClient = getConvexClient();
    if (!convexClient)
      return errorResponse("Convex client not configured", 500);

    // App-layer auth: do NOT pass app JWT to Convex (no convexClient.setAuth)
    // Convex queries below must rely on server-side functions that resolve identity without JWT

    const { searchParams } = new URL(request.url);

    // Input validation and sanitization
    const city =
      searchParams
        .get("city")
        ?.trim()
        .replace(/[<>'\"&]/g, "") || undefined;
    const country =
      searchParams
        .get("country")
        ?.trim()
        .replace(/[<>'\"&]/g, "") || undefined;

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
      return errorResponse(
        "Minimum age cannot be greater than maximum age",
        400
      );
    }

    // Validate preferred gender
    const validGenders: Gender[] = ["any", "male", "female", "other"];
    const preferredGender =
      preferredGenderParam &&
      validGenders.includes(preferredGenderParam as Gender)
        ? (preferredGenderParam as Gender)
        : undefined;

    // Validate pagination parameters
    const page = Math.max(0, Math.min(100, parseInt(pageParam) || 0)); // Limit to 100 pages
    const pageSize = Math.max(1, Math.min(50, parseInt(pageSizeParam) || 12)); // Limit page size to 50

    // Validate city if provided
    if (city && (city.length < 2 || city.length > 50)) {
      return errorResponse("Invalid city parameter", 400);
    }

    // Validate country if provided
    if (country && (country.length < 2 || country.length > 50)) {
      return errorResponse("Invalid country parameter", 400);
    }

    console.log("Searching profiles with params:", {
      city,
      country,
      ageMin,
      ageMax,
      preferredGender,
      page,
      pageSize,
      userId,
    });

    const result = await convexClient.query(api.users.searchPublicProfiles, {
      city,
      country,
      ageMin,
      ageMax,
      preferredGender,
      page,
      pageSize,
    });

    // Validate and sanitize search results
    if (!result || typeof result !== "object") {
      console.error("Invalid search results from Convex:", result);
      return errorResponse("Search service error", 500);
    }

    // Log search for analytics (without sensitive data)
    console.log(
      `Profile search by user ${userId}: page=${page}, filters=${JSON.stringify({ city: !!city, ageMin, ageMax, preferredGender })}`
    );

    return successResponse({
      ...result,
      page,
      pageSize,
      searchParams: {
        city,
        country,
        ageMin,
        ageMax,
        preferredGender,
      },
    });
  } catch (error) {
    console.error("Error in search API route:", error);

    // Log security event for monitoring
    // logSecurityEvent('VALIDATION_FAILED', {
    //   endpoint: 'search',
    //   error: error instanceof Error ? error.message : 'Unknown error'
    // }, request);

    // Handle Convex authentication errors
    if (
      error instanceof Error &&
      (error.message.includes("AUTHENTICATION_ERROR") ||
        error.message.includes("Unauthenticated"))
    ) {
      return errorResponse("Authentication failed. Please log in again.", 401);
    }

    // Don't expose internal error details in production
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : "Unknown error"
        : "Search service temporarily unavailable";

    return errorResponse(errorMessage, 500);
  }
}
