import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
type Profile = any;
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";
import { fetchQuery } from "convex/nextjs";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const status = 403;
    const body = { error: "Admin privileges required", correlationId };
    devLog("warn", "admin.matches", "auth_failed", { correlationId, statusCode: status, durationMs: Date.now() - startedAt });
    return NextResponse.json(body, { status });
  }

  try {
    const profilesResult = await fetchQuery(api.users.adminListProfiles, { page: 1, pageSize: 10000 } as any).catch((e: unknown) => {
      devLog("error", "admin.matches", "convex_query_error", { message: e instanceof Error ? e.message : String(e), correlationId, statusCode: 500, durationMs: Date.now() - startedAt });
      return { profiles: [] as Profile[] } as any;
    });

    const allProfiles: Profile[] = (profilesResult as any)?.profiles || [];

    const allMatches = await Promise.all(
      allProfiles.map(async (profile: Profile) => {
        try {
          const matches = await fetchQuery(api.users.getMatchesForProfile, { profileId: (profile as any)._id } as any);
          return { profileId: (profile as any)._id, matches };
        } catch (e) {
          devLog("error", "admin.matches", "convex_query_error", { profileId: (profile as { _id: string })._id, message: e instanceof Error ? e.message : String(e), correlationId, statusCode: 500, durationMs: Date.now() - startedAt });
          return {
            profileId: (profile as any)._id,
            matches: [],
            error: "Failed to fetch matches",
          };
        }
      })
    );

    devLog("info", "admin.matches", "success", { correlationId, statusCode: 200, durationMs: Date.now() - startedAt, profiles: allProfiles.length });
    return NextResponse.json(
      { success: true, matches: allMatches, correlationId },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    devLog("error", "admin.matches", "unhandled_error", { message, correlationId, statusCode: 500, durationMs: Date.now() - startedAt });
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches", correlationId },
      { status: 500 }
    );
  }
}
