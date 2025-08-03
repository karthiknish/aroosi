import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { Notifications } from "@/lib/notify";
import type { Profile } from "@/types/profile";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    console.warn("Admin profile GET auth failed", {
      scope: "admin.profile",
      type: "auth_failed",
      correlationId,
      statusCode: 401,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Unauthorized", correlationId }, { status: 401 });
  }

  const convex = getConvexClient();
  if (!convex) {
    console.error("Admin profile GET convex not configured", {
      scope: "admin.profile",
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
  try {
    // @ts-ignore legacy
    convex.setAuth?.(token);
  } catch {}

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;
  const { searchParams } = url;

  try {
    if (searchParams.get("matches")) {
      const result = await convex
        .query(api.users.getMatchesForProfile, {
          profileId: id as unknown as Id<"profiles">,
        })
        .catch((e: unknown) => {
          console.error("Admin profile GET matches query error", {
            scope: "admin.profile",
            type: "convex_query_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return null;
        });
      if (!result) {
        return NextResponse.json(
          { error: "Failed to fetch matches", correlationId },
          { status: 500 }
        );
      }
      console.info("Admin profile GET matches success", {
        scope: "admin.profile",
        type: "success",
        correlationId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ success: true, matches: result, correlationId }, { status: 200 });
    }

    const result = await convex
      .query(api.users.getProfileById, {
        id: id as unknown as Id<"profiles">,
      })
      .catch((e: unknown) => {
        console.error("Admin profile GET profileById error", {
          scope: "admin.profile",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to fetch profile", correlationId },
        { status: 500 }
      );
    }

    console.info("Admin profile GET success", {
      scope: "admin.profile",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ success: true, profile: result, correlationId }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Admin profile GET unhandled error", {
      scope: "admin.profile",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Failed", correlationId }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized", correlationId }, { status: 401 });
  }

  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json(
      { error: "Convex client not configured", correlationId },
      { status: 500 }
    );
  }
  try {
    // @ts-ignore legacy
    convex.setAuth?.(token);
  } catch {}

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  let updates: unknown;
  try {
    updates = await req.json();
  } catch {
    return NextResponse.json({ error: "Missing updates", correlationId }, { status: 400 });
  }
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Missing updates", correlationId }, { status: 400 });
  }

  const result = await convex
    .mutation(api.users.adminUpdateProfile, {
      id: id as unknown as Id<"profiles">,
      updates,
    })
    .catch((e: unknown) => {
      console.error("Admin profile PUT mutation error", {
        scope: "admin.profile",
        type: "convex_mutation_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return null;
    });

  if (!result) {
    return NextResponse.json(
      { error: "Failed to update profile", correlationId },
      { status: 500 }
    );
  }

  try {
    const updated = (await convex.query(api.users.getProfileById, {
      id: id as unknown as Id<"profiles">,
    })) as Profile | null;

    if (updated && updated.email) {
      if (
        (updates as Record<string, unknown>)?.subscriptionPlan &&
        typeof (updates as Record<string, unknown>).subscriptionPlan === "string"
      ) {
        await Notifications.subscriptionChanged(
          updated.email,
          updated.fullName || updated.email,
          (updates as { subscriptionPlan: string }).subscriptionPlan,
        );
      }
    }
  } catch (e) {
    console.error("admin profile notify error", {
      scope: "admin.profile",
      type: "notify_error",
      message: e instanceof Error ? e.message : String(e),
      correlationId,
    });
  }

  console.info("Admin profile PUT success", {
    scope: "admin.profile",
    type: "success",
    correlationId,
    statusCode: 200,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ success: true, result, correlationId }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized", correlationId }, { status: 401 });
  }

  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json(
      { error: "Convex client not configured", correlationId },
      { status: 500 }
    );
  }
  try {
    // @ts-ignore legacy
    convex.setAuth?.(token);
  } catch {}

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const result = await convex
    .mutation(api.users.deleteProfile, {
      id: id as unknown as Id<"profiles">,
    })
    .catch((e: unknown) => {
      console.error("Admin profile DELETE mutation error", {
        scope: "admin.profile",
        type: "convex_mutation_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return null;
    });

  if (!result) {
    return NextResponse.json(
      { error: "Failed to delete profile", correlationId },
      { status: 500 }
    );
  }

  console.info("Admin profile DELETE success", {
    scope: "admin.profile",
    type: "success",
    correlationId,
    statusCode: 200,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ success: true, result, correlationId }, { status: 200 });
}
