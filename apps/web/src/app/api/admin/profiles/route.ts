import { NextRequest } from "next/server";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext,
} from "@/lib/api/handler";
import {
  listProfiles,
  updateProfileById,
  deleteProfileById,
} from "@/lib/admin/firestoreAdminProfiles";
import type { Profile } from "@aroosi/shared/types";
import { adminProfileUpdateSchema } from "@/lib/validation/apiSchemas/adminProfiles";

// Helper for admin role check
const ensureAdminRole = (ctx: AuthenticatedApiContext) => {
  if (ctx.user.role !== "admin") {
    throw Object.assign(new Error("Admin privileges required"), { status: 403, code: "FORBIDDEN" });
  }
};

export const GET = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  ensureAdminRole(ctx);
  const { correlationId, request } = ctx;
  const { searchParams } = new URL(request.url);
  
  try {
    const rawSearch = searchParams.get("search") ?? undefined;
    const search = rawSearch ? rawSearch.trim().replace(/[<>'"&]/g, "") : undefined;
    
    const page = Math.max(1, Math.min(1000, parseInt(searchParams.get("page") || "1", 10) || 1));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "10", 10) || 10));
    
    const sortByParam = (searchParams.get("sortBy") || "createdAt") as "createdAt" | "banned" | "subscriptionPlan";
    const sortDirParam = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
    const bannedParam = (searchParams.get("banned") || "all") as "true" | "false" | "all";
    const planParam = (searchParams.get("plan") || "all") as "all" | "free" | "premium" | "premiumPlus";

    if (search && (search.length < 2 || search.length > 100)) {
      return errorResponse("Invalid search parameter", 400, { correlationId });
    }

    const { profiles, total } = await listProfiles({
      search,
      page,
      pageSize,
      sortBy: sortByParam,
      sortDir: sortDirParam,
      banned: bannedParam,
      plan: planParam,
    });

    return successResponse({
      profiles,
      total,
      page,
      pageSize,
      sortBy: sortByParam,
      sortDir: sortDirParam,
      banned: bannedParam,
      plan: planParam,
    }, 200, correlationId);
  } catch (error) {
    console.error("[admin.profiles.get] fatal error", { correlationId, error });
    return errorResponse("Internal server error", 500, { correlationId });
  }
}, {
  rateLimit: { identifier: "admin_profiles_get", maxRequests: 100 }
});

export const DELETE = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, body: any) => {
  ensureAdminRole(ctx);
  const { correlationId } = ctx;
  
  try {
    if (!body?.id || typeof body.id !== "string") {
      return errorResponse("Missing or invalid profile ID", 400, { correlationId });
    }
    
    const ok = await deleteProfileById(body.id);
    if (!ok) return errorResponse("Profile deletion failed", 500, { correlationId });
    
    return successResponse({ success: true }, 200, correlationId);
  } catch (error) {
    console.error("[admin.profiles.delete] fatal error", { correlationId, error });
    return errorResponse("Internal server error", 500, { correlationId });
  }
}, {
  rateLimit: { identifier: "admin_profiles_delete", maxRequests: 10 }
});

export const PUT = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, body: any) => {
  ensureAdminRole(ctx);
  const { correlationId } = ctx;
  
  try {
    if (!body?.id || typeof body.id !== "string") {
      return errorResponse("Missing or invalid profile ID", 400, { correlationId });
    }
    if (!body.updates || typeof body.updates !== "object") {
      return errorResponse("Missing or invalid updates", 400, { correlationId });
    }

    const ADMIN_PROFILE_UPDATE_ALLOWED_FIELDS = [
      "fullName", "aboutMe", "motherTongue", "religion", 
      "ethnicity", "hideFromFreeUsers", "subscriptionPlan", "subscriptionExpiresAt",
    ] as const;

    const filteredEntries = Object.entries(body.updates).filter(([k, v]) =>
      (ADMIN_PROFILE_UPDATE_ALLOWED_FIELDS as readonly string[]).includes(k) && v !== undefined && v !== null
    );

    if (!filteredEntries.length) {
      return errorResponse("No valid update fields provided", 400, { correlationId });
    }

    const preSanitized = Object.fromEntries(
      filteredEntries.map(([k, v]) => [k, typeof v === "string" ? v.trim().replace(/[<>'"&]/g, "") : v])
    );

    const parsed = adminProfileUpdateSchema.safeParse(preSanitized);
    if (!parsed.success) {
      return errorResponse("Invalid update fields", 400, {
        correlationId,
        details: {
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
            code: i.code,
          })),
        },
      });
    }

    const updated = await updateProfileById(body.id, parsed.data as Partial<Profile>);
    if (!updated) return errorResponse("Profile update failed", 500, { correlationId });
    
    return successResponse(updated, 200, correlationId);
  } catch (error) {
    console.error("[admin.profiles.put] fatal error", { correlationId, error });
    return errorResponse("Internal server error", 500, { correlationId });
  }
}, {
  rateLimit: { identifier: "admin_profiles_update", maxRequests: 50 }
});

