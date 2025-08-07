import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import type { Profile } from "@convex/users";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchQuery } from "convex/nextjs";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const { role } = await requireAuth(req);
  if ((role || "user") !== "admin") {
    const status = 403;
    const body = { error: "Admin privileges required", correlationId };
    console.warn("Admin matches GET auth failed", {
      scope: "admin.matches",
      type: "auth_failed",
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(body, { status });
  }

  try {
    const profilesResult = await fetchQuery(api.users.adminListProfiles, {
      page: 1,
      pageSize: 10000,
    }).catch((e: unknown) => {
      console.error("Admin matches GET adminListProfiles error", {
        scope: "admin.matches",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return { profiles: [] as Profile[] } as any;
    });

    const allProfiles: Profile[] = (profilesResult as any)?.profiles || [];

    const allMatches = await Promise.all(
      allProfiles.map(async (profile: Profile) => {
        try {
          const matches = await fetchQuery(api.users.getMatchesForProfile, {
            profileId: (profile as any)._id,
          });
          return { profileId: (profile as any)._id, matches };
        } catch (e) {
          console.error("Admin matches GET getMatchesForProfile error", {
            scope: "admin.matches",
            type: "convex_query_error",
            profileId: (profile as { _id: string })._id,
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return {
            profileId: (profile as any)._id,
            matches: [],
            error: "Failed to fetch matches",
          };
        }
      })
    );

    console.info("Admin matches GET success", {
      scope: "admin.matches",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      profiles: allProfiles.length,
    });
    return NextResponse.json(
      { success: true, matches: allMatches, correlationId },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Admin matches GET unhandled error", {
      scope: "admin.matches",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches", correlationId },
      { status: 500 }
    );
  }
}
