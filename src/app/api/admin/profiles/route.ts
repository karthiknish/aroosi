import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { requireAuth } from "@/lib/auth/requireAuth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

export async function GET(req: NextRequest) {
  try {
    // Cookie-only admin authentication
    const adminCheck = await requireAdminSession(req);
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
    const { userId } = adminCheck;

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
    
    const { searchParams } = new URL(req.url);

    // Input validation and sanitization
    const rawSearch = searchParams.get("search") ?? undefined;
    const search = rawSearch ? rawSearch.trim().replace(/[<>'\"&]/g, "") : undefined;

    // Pagination
    const pageParam = searchParams.get("page") || "1"; // 1-based for API
    const pageSizeParam = searchParams.get("pageSize") || "10";
    const page = Math.max(1, Math.min(1000, parseInt(pageParam, 10) || 1)); // Limit to 1000 pages
    const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam, 10) || 10)); // Limit page size to 100

    // Sort and filters (approved contract)
    const sortByParam = (searchParams.get("sortBy") || "createdAt") as
      | "createdAt"
      | "banned"
      | "subscriptionPlan";
    const sortDirParam = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
    const bannedParam = (searchParams.get("banned") || "all") as "true" | "false" | "all";
    const planParam = (searchParams.get("plan") || "all") as
      | "all"
      | "free"
      | "premium"
      | "premiumPlus";
    const isProfileCompleteParam = (searchParams.get("isProfileComplete") || "all") as
      | "all"
      | "true"
      | "false";

    // Validate search term
    if (search && (search.length < 2 || search.length > 100)) {
      return errorResponse("Invalid search parameter", 400);
    }

    // Validate enums (fallback to defaults if invalid)
    const sortBy: "createdAt" | "banned" | "subscriptionPlan" =
      ["createdAt", "banned", "subscriptionPlan"].includes(sortByParam)
        ? sortByParam
        : "createdAt";
    const sortDir: "asc" | "desc" = ["asc", "desc"].includes(sortDirParam) ? sortDirParam : "desc";
    const banned: "true" | "false" | "all" =
      ["true", "false", "all"].includes(bannedParam) ? bannedParam : "all";
    const plan: "all" | "free" | "premium" | "premiumPlus" =
      ["all", "free", "premium", "premiumPlus"].includes(planParam) ? planParam : "all";
    const isProfileComplete: "all" | "true" | "false" =
      ["all", "true", "false"].includes(isProfileCompleteParam) ? isProfileCompleteParam : "all";

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
      sortBy,
      sortDir,
      banned,
      plan,
      isProfileComplete,
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
      sortBy,
      sortDir,
      banned,
      plan,
      isProfileComplete,
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
    // Cookie-only admin authentication
    const adminCheck = await requireAdminSession(req);
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
    const { userId } = adminCheck;

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
    // Cookie-only admin authentication
    const adminCheck = await requireAdminSession(req);
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
    const { userId } = adminCheck;

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

    // Centralized allowlist + zod validation for admin profile updates
    const ADMIN_PROFILE_UPDATE_ALLOWED_FIELDS = [
      "fullName",
      "aboutMe",
      "isProfileComplete",
      "motherTongue",
      "religion",
      "ethnicity",
      "hideFromFreeUsers",
      // Subscription fields allowed only via admin context
      "subscriptionPlan",
      "subscriptionExpiresAt",
    ] as const;

    // Lazy import zod to avoid route cold-start cost unless needed
    const { z } = await import("zod");

    const UpdateSchema = z.object({
      fullName: z.string().trim().max(200).optional(),
      aboutMe: z.string().trim().max(5000).optional(),
      isProfileComplete: z.boolean().optional(),
      motherTongue: z.string().trim().max(100).optional(),
      religion: z.string().trim().max(100).optional(),
      ethnicity: z.string().trim().max(100).optional(),
      hideFromFreeUsers: z.boolean().optional(),
      subscriptionPlan: z.enum(["free", "premium", "premiumPlus"]).optional(),
      subscriptionExpiresAt: z.number().int().positive().optional(),
    })
    // Disallow unknown keys early
    .strict();

    // Remove unknown keys before validation; then validate with zod
    const filteredEntries = Object.entries(body.updates).filter(
      ([key, value]) =>
        (ADMIN_PROFILE_UPDATE_ALLOWED_FIELDS as readonly string[]).includes(key) &&
        value !== null && value !== undefined
    );

    if (filteredEntries.length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    // Basic string sanitization on string fields prior to validation
    const preSanitized = Object.fromEntries(
      filteredEntries.map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim().replace(/[<>'\"&]/g, "") : value,
      ])
    );

    const parseResult = UpdateSchema.safeParse(preSanitized);
    if (!parseResult.success) {
      return errorResponse("Invalid update fields", 400, {
        issues: parseResult.error.issues?.map((i) => ({
          path: i.path?.join("."),
          message: i.message,
          code: i.code,
        })),
      });
    }

    const sanitizedUpdates = parseResult.data;

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
