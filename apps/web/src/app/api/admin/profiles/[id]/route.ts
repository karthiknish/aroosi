import { NextRequest, NextResponse } from "next/server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import {
  getProfileById,
  updateProfileById,
  deleteProfileById,
} from "@/lib/admin/firestoreAdminProfiles";
import { db } from "@/lib/firebaseAdmin";
import { Notifications } from "@/lib/notify";
import type { Profile } from "@aroosi/shared/types";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    await ensureAdmin();
  } catch (e) {
    return NextResponse.json(
      { error: "Unauthorized", correlationId },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;
  const { searchParams } = url;

  try {
    if (searchParams.get("matches")) {
      // Firestore matches query: assume collection "matches" with participants array
      const matchesSnap = await db
        .collection("matches")
        .where("participants", "array-contains", id)
        .limit(200)
        .get();
      const matches = matchesSnap.docs.map(
        (d: QueryDocumentSnapshot): Record<string, unknown> => ({
          id: d.id,
          ...(d.data() as Record<string, unknown>),
        })
      );
      return NextResponse.json(
        { success: true, matches, correlationId },
        { status: 200 }
      );
    }

    const result = await getProfileById(id);
    console.log("result", result);
    if (!result) {
      console.info("Admin profile GET not_found", {
        scope: "admin.profile",
        type: "not_found",
        correlationId,
        profileId: id,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { success: false, error: "Profile not found", correlationId },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    console.info("Admin profile GET success", {
      scope: "admin.profile",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    const nocache = searchParams.get("nocache") === "true";
    return NextResponse.json(
      { success: true, profile: result, correlationId },
      {
        status: 200,
        headers: {
          "Cache-Control": nocache
            ? "no-store"
            : "private, max-age=30, stale-while-revalidate=120",
        },
      }
    );
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
    return NextResponse.json(
      { error: "Failed", correlationId },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    await ensureAdmin();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", correlationId },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  let updates: unknown;
  try {
    updates = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Missing updates", correlationId },
      { status: 400 }
    );
  }
  if (!updates || typeof updates !== "object") {
    return NextResponse.json(
      { error: "Missing updates", correlationId },
      { status: 400 }
    );
  }

  let result: Profile | null = null;
  try {
    result = await updateProfileById(id, updates as Partial<Profile>);
  } catch (e) {
    console.error("Admin profile PUT update error", {
      message: e instanceof Error ? e.message : String(e),
      correlationId,
    });
    result = null;
  }

  if (!result) {
    return NextResponse.json(
      { error: "Failed to update profile", correlationId },
      { status: 500 }
    );
  }

  try {
    if (result && result.email) {
      if (
        (updates as any)?.subscriptionPlan &&
        typeof (updates as any).subscriptionPlan === "string"
      ) {
        await Notifications.subscriptionChanged(
          result.email,
          result.fullName || result.email,
          (updates as { subscriptionPlan: string }).subscriptionPlan
        );
      }
    }
  } catch (e) {
    console.error("admin profile notify error", {
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
  return NextResponse.json(
    { success: true, result, correlationId },
    { status: 200 }
  );
}

export async function DELETE(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    await ensureAdmin();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", correlationId },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  let deleted = false;
  try {
    deleted = await deleteProfileById(id);
  } catch (e) {
    console.error("Admin profile DELETE error", {
      message: e instanceof Error ? e.message : String(e),
      correlationId,
    });
  }

  if (!deleted) {
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
  return NextResponse.json(
    { success: true, deleted: true, correlationId },
    { status: 200 }
  );
}
