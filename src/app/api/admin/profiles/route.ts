import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { requireAdminToken } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

export async function GET(req: NextRequest) {
  try {
    // Enhanced admin authentication
    const adminCheck = requireAdminToken(req);
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
    const { token, userId } = adminCheck;

    // Rate limiting for admin operations
    const rateLimitResult = checkApiRateLimit(`admin_profiles_${userId}`, 100, 60000); // 100 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    if (!convex) {
      return errorResponse("Service temporarily unavailable", 503);
    }
    
    convex.setAuth(token);
    
    const { searchParams } = new URL(req.url);
    
    // Input validation and sanitization
    const search = searchParams.get("search")?.trim().replace(/[<>'\"&]/g, '') || undefined;
    const pageParam = searchParams.get("page") || "0";
    const pageSizeParam = searchParams.get("pageSize") || "10";
    
    // Validate pagination parameters
    const page = Math.max(0, Math.min(1000, parseInt(pageParam, 10) || 0)); // Limit to 1000 pages
    const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam, 10) || 10)); // Limit page size to 100
    
    // Validate search term
    if (search && (search.length < 2 || search.length > 100)) {
      return errorResponse("Invalid search parameter", 400);
    }

    // Log admin action for security monitoring
    // logSecurityEvent('UNAUTHORIZED_ACCESS', {
    //   userId,
    //   action: 'list_profiles',
    //   params: { search: !!search, page, pageSize }
    // }, req);

    const result = await convex.query(api.users.adminListProfiles, {
      search,
      page,
      pageSize,
    });

    // Validate result structure
    if (!result || typeof result !== 'object') {
      console.error("Invalid admin profiles result from Convex:", result);
      return errorResponse("Admin service error", 500);
    }

    return successResponse({
      ...result,
      page,
      pageSize,
    });

  } catch (error) {
    console.error("Error in admin profiles GET:", error);
    
    // logSecurityEvent('VALIDATION_FAILED', {
    //   endpoint: 'admin/profiles',
    //   method: 'GET',
    //   error: error instanceof Error ? error.message : 'Unknown error'
    // }, req);

    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Admin authentication failed", 401);
    }
    
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Enhanced admin authentication
    const adminCheck = requireAdminToken(req);
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
    const { token, userId } = adminCheck;

    // Strict rate limiting for profile deletion
    const rateLimitResult = checkApiRateLimit(`admin_delete_profile_${userId}`, 10, 60000); // 10 deletions per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    if (!convex) {
      return errorResponse("Service temporarily unavailable", 503);
    }
    
    convex.setAuth(token);

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body || typeof body !== "object") {
      return errorResponse("Missing or invalid body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return errorResponse("Missing or invalid profile ID", 400);
    }

    // Log critical admin action
    // //logSecurityEvent('ADMIN_ACTION', {
    //   userId,
    //   action: 'delete_profile',
    //   targetProfileId: body.id
    // }, req);

    console.log(`Admin ${userId} attempting to delete profile: ${body.id}`);

    const result = await convex.mutation(api.users.deleteProfile, {
      id: body.id,
    });

    // Validate deletion result
    if (!result || typeof result !== 'object') {
      console.error("Invalid deletion result from Convex:", result);
      return errorResponse("Profile deletion failed", 500);
    }

    console.log(`Profile ${body.id} deleted successfully by admin ${userId}`);
    return successResponse(result);

  } catch (error) {
    console.error("Error in admin profile DELETE:", error);
    
    // logSecurityEvent('VALIDATION_FAILED', {
    //   endpoint: 'admin/profiles',
    //   method: 'DELETE',
    //   error: error instanceof Error ? error.message : 'Unknown error'
    // }, req);

    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Admin authentication failed", 401);
    }
    
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Enhanced admin authentication
    const adminCheck = requireAdminToken(req);
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
    const { token, userId } = adminCheck;

    // Rate limiting for admin profile updates
    const rateLimitResult = checkApiRateLimit(`admin_update_profile_${userId}`, 50, 60000); // 50 updates per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    if (!convex) {
      return errorResponse("Service temporarily unavailable", 503);
    }
    
    convex.setAuth(token);

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body || typeof body !== "object") {
      return errorResponse("Missing or invalid body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return errorResponse("Missing or invalid profile ID", 400);
    }

    if (!body.updates || typeof body.updates !== "object") {
      return errorResponse("Missing or invalid updates", 400);
    }

    // Sanitize updates object
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(body.updates)
        .filter(([key, value]) => {
          // Only allow specific admin-updatable fields
          const allowedFields = [
            'hideFromFreeUsers',
            'subscriptionPlan', 'subscriptionExpiresAt', 'fullName',
            'aboutMe', 'isProfileComplete', 'motherTongue', 'religion', 'ethnicity'
          ];
          return allowedFields.includes(key) && value !== null && value !== undefined;
        })
        .map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim().replace(/[<>'\"&]/g, '') : value
        ])
    );

    if (Object.keys(sanitizedUpdates).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    // Log admin action
    // //logSecurityEvent('ADMIN_ACTION', {
    //   userId,
    //   action: 'update_profile',
    //   targetProfileId: body.id,
    //   fields: Object.keys(sanitizedUpdates)
    // }, req);

    console.log(`Admin ${userId} updating profile ${body.id} with fields: ${Object.keys(sanitizedUpdates).join(', ')}`);

    const result = await convex.mutation(api.users.adminUpdateProfile, {
      id: body.id,
      updates: sanitizedUpdates,
    });

    // Validate update result
    if (!result || typeof result !== 'object') {
      console.error("Invalid update result from Convex:", result);
      return errorResponse("Profile update failed", 500);
    }

    console.log(`Profile ${body.id} updated successfully by admin ${userId}`);
    return successResponse(result);

  } catch (error) {
    console.error("Error in admin profile PUT:", error);
    
    // logSecurityEvent('VALIDATION_FAILED', {
    //   endpoint: 'admin/profiles',
    //   method: 'PUT',
    //   error: error instanceof Error ? error.message : 'Unknown error'
    // }, req);

    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Admin authentication failed", 401);
    }
    
    return errorResponse("Internal server error", 500);
  }
}
