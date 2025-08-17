import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import {
  listProfiles,
  updateProfileById,
  deleteProfileById,
} from "@/lib/admin/firestoreAdminProfiles";
import type { Profile } from "@/types/profile";

function devLog(
  level: "info" | "error",
  scope: string,
  event: string,
  meta: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "production")
    console[level](`[${scope}] ${event}`, meta);
}

export async function GET(req: NextRequest) {
  try {
    const admin = await ensureAdmin();
    const rl = checkApiRateLimit(`admin_profiles_${admin.id}`, 100, 60_000);
    if (!rl.allowed) return errorResponse("Rate limit exceeded", 429);
    const { searchParams } = new URL(req.url);
    const rawSearch = searchParams.get("search") ?? undefined;
    const search = rawSearch
      ? rawSearch.trim().replace(/[<>'"&]/g, "")
      : undefined;
    const page = Math.max(
      1,
      Math.min(1000, parseInt(searchParams.get("page") || "1", 10) || 1)
    );
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("pageSize") || "10", 10) || 10)
    );
    const sortByParam = (searchParams.get("sortBy") || "createdAt") as
      | "createdAt"
      | "banned"
      | "subscriptionPlan";
    const sortDirParam = (searchParams.get("sortDir") || "desc") as
      | "asc"
      | "desc";
    const bannedParam = (searchParams.get("banned") || "all") as
      | "true"
      | "false"
      | "all";
    const planParam = (searchParams.get("plan") || "all") as
      | "all"
      | "free"
      | "premium"
      | "premiumPlus";
    const isProfileCompleteParam = (searchParams.get("isProfileComplete") ||
      "all") as "all" | "true" | "false";
    if (search && (search.length < 2 || search.length > 100))
      return errorResponse("Invalid search parameter", 400);
    const sortBy = ["createdAt", "banned", "subscriptionPlan"].includes(
      sortByParam
    )
      ? sortByParam
      : "createdAt";
    const sortDir = ["asc", "desc"].includes(sortDirParam)
      ? sortDirParam
      : "desc";
    const banned = ["true", "false", "all"].includes(bannedParam)
      ? bannedParam
      : "all";
    const plan = ["all", "free", "premium", "premiumPlus"].includes(planParam)
      ? planParam
      : "all";
    const isProfileComplete = ["all", "true", "false"].includes(
      isProfileCompleteParam
    )
      ? isProfileCompleteParam
      : "all";
    const { profiles, total } = await listProfiles({
      search,
      page,
      pageSize,
      sortBy,
      sortDir,
      banned,
      plan,
      isProfileComplete,
    });
    return successResponse({
      profiles,
      total,
      page,
      pageSize,
      sortBy,
      sortDir,
      banned,
      plan,
      isProfileComplete,
    });
  } catch (error) {
    devLog("error", "admin.profiles", "unhandled_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(
      error instanceof Error && /auth/i.test(error.message)
        ? "Admin authentication failed"
        : "Internal server error",
      error instanceof Error && /auth/i.test(error.message) ? 401 : 500
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await ensureAdmin();
    const rl = checkApiRateLimit(
      `admin_delete_profile_${admin.id}`,
      10,
      60_000
    );
    if (!rl.allowed) return errorResponse("Rate limit exceeded", 429);
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object")
      return errorResponse("Missing or invalid body", 400);
    if (!body.id || typeof body.id !== "string")
      return errorResponse("Missing or invalid profile ID", 400);
    const ok = await deleteProfileById(body.id);
    if (!ok) return errorResponse("Profile deletion failed", 500);
    devLog("info", "admin.profiles", "deleted", {
      profileId: body.id,
      admin: admin.id,
    });
    return successResponse({ success: true });
  } catch (error) {
    devLog("error", "admin.profiles", "delete_unhandled_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await ensureAdmin();
    const rl = checkApiRateLimit(
      `admin_update_profile_${admin.id}`,
      50,
      60_000
    );
    if (!rl.allowed) return errorResponse("Rate limit exceeded", 429);
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object")
      return errorResponse("Missing or invalid body", 400);
    if (!body.id || typeof body.id !== "string")
      return errorResponse("Missing or invalid profile ID", 400);
    if (!body.updates || typeof body.updates !== "object")
      return errorResponse("Missing or invalid updates", 400);
    const ADMIN_PROFILE_UPDATE_ALLOWED_FIELDS = [
      "fullName",
      "aboutMe",
      "isProfileComplete",
      "motherTongue",
      "religion",
      "ethnicity",
      "hideFromFreeUsers",
      "subscriptionPlan",
      "subscriptionExpiresAt",
    ] as const;
    const { z } = await import("zod");
    const UpdateSchema = z
      .object({
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
      .strict();
    const filteredEntries = Object.entries(body.updates).filter(
      ([k, v]) =>
        (ADMIN_PROFILE_UPDATE_ALLOWED_FIELDS as readonly string[]).includes(
          k
        ) &&
        v !== undefined &&
        v !== null
    );
    if (!filteredEntries.length)
      return errorResponse("No valid update fields provided", 400);
    const preSanitized = Object.fromEntries(
      filteredEntries.map(([k, v]) => [
        k,
        typeof v === "string" ? v.trim().replace(/[<>'"&]/g, "") : v,
      ])
    );
    const parsed = UpdateSchema.safeParse(preSanitized);
    if (!parsed.success)
      return errorResponse("Invalid update fields", 400, {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
          code: i.code,
        })),
      });
    const updated = await updateProfileById(
      body.id,
      parsed.data as Partial<Profile>
    );
    if (!updated) return errorResponse("Profile update failed", 500);
    devLog("info", "admin.profiles", "updated", {
      profileId: body.id,
      admin: admin.id,
    });
    return successResponse(updated);
  } catch (error) {
    devLog("error", "admin.profiles", "update_unhandled_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Internal server error", 500);
  }
}
