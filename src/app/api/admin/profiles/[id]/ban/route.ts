import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { Notifications } from "@/lib/notify";
import type { Profile } from "@/types/profile";
import { requireAdminSession } from "@/app/api/_utils/auth";

export async function PUT(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const res = adminCheck.errorResponse as NextResponse;
    const status = res.status || 401;
    let body: unknown = { error: "Unauthorized", correlationId };
    try {
      const txt = await res.text();
      body = txt ? { ...JSON.parse(txt), correlationId } : body;
    } catch {}
  console.warn("Admin profile.ban PUT auth missing", {
      scope: "admin.profile_ban",
      type: "auth_failed",
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(body, { status });
  }

  const convex = getConvexClient();
  if (!convex) {
    console.error("Admin profile.ban PUT convex not configured", {
      scope: "admin.profile_ban",
      type: "convex_not_configured",
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Convex client not configured", correlationId },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const id = url.pathname.split("/").slice(-2, -1)[0]!; // /profiles/[id]/ban
  let body: { banned?: boolean } = {};
  try {
    body = await req.json();
  } catch {}
  if (typeof body.banned !== "boolean") {
    console.warn("Admin profile.ban PUT invalid banned status", {
      scope: "admin.profile_ban",
      type: "validation_error",
      correlationId,
      statusCode: 400,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Missing or invalid banned status", correlationId },
      { status: 400 }
    );
  }

  try {
    const profile = await convex
      .query(api.users.getProfileById, {
        id: id as unknown as Id<"profiles">,
      })
      .catch((e: unknown) => {
        console.error("Admin profile.ban PUT getProfileById error", {
          scope: "admin.profile_ban",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (!profile || !(profile as { userId?: unknown })?.userId) {
      return NextResponse.json(
        { error: "Profile not found", correlationId },
        { status: 404 }
      );
    }

    let result: unknown;
    if (body.banned) {
      result = await convex
        .mutation(api.users.banUser, {
          userId: (profile as { userId: Id<"users"> }).userId,
        })
        .catch((e: unknown) => {
          console.error("Admin profile.ban PUT banUser error", {
            scope: "admin.profile_ban",
            type: "convex_mutation_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return null;
        });
      if ((profile as { email?: string }).email) {
        try {
          await Notifications.profileBanStatus((profile as { email: string }).email, {
            profile: profile as Profile,
            banned: true,
          });
        } catch (e) {
          console.error("Admin profile.ban PUT notify ban error", {
            scope: "admin.profile_ban",
            type: "unhandled_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
          });
        }
      }
    } else {
      result = await convex
        .mutation(api.users.unbanUser, {
          userId: (profile as { userId: Id<"users"> }).userId,
        })
        .catch((e: unknown) => {
          console.error("Admin profile.ban PUT unbanUser error", {
            scope: "admin.profile_ban",
            type: "convex_mutation_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return null;
        });
      if ((profile as { email?: string }).email) {
        try {
          await Notifications.profileBanStatus((profile as { email: string }).email, {
            profile: profile as Profile,
            banned: false,
          });
        } catch (e) {
          console.error("Admin profile.ban PUT notify unban error", {
            scope: "admin.profile_ban",
            type: "unhandled_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
          });
        }
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: "Failed to update ban status", correlationId },
        { status: 500 }
      );
    }

    console.info("Admin profile.ban PUT success", {
      scope: "admin.profile_ban",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      banned: body.banned,
      profileId: id,
    });
    return NextResponse.json({ success: true, correlationId }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Admin profile.ban PUT unhandled error", {
      scope: "admin.profile_ban",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to update ban status", correlationId },
      { status: 500 }
    );
  }
}
