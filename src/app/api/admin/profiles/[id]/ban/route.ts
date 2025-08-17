import { NextRequest, NextResponse } from "next/server";
import { Notifications } from "@/lib/notify";
import { requireAuth } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";

interface BanRequestBody {
  banned?: boolean;
}

async function getUserProfile(userId: string) {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as any) };
}

export async function PUT(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const { role } = await requireAuth(req);
  if ((role || "user") !== "admin") {
    const status = 403;
    const body = { error: "Unauthorized", correlationId };
    console.warn("Admin profile.ban PUT auth missing", {
      scope: "admin.profile_ban",
      type: "auth_failed",
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const id = url.pathname.split("/").slice(-2, -1)[0]!; // /profiles/[id]/ban
  let body: BanRequestBody = {};
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
    const profile = await getUserProfile(id).catch((e: unknown) => {
      console.error("Admin profile.ban PUT fetch user error", {
        scope: "admin.profile_ban",
        type: "firestore_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return null;
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found", correlationId },
        { status: 404 }
      );
    }
    // Update banned flag in Firestore
    try {
      await db
        .collection("users")
        .doc(profile.id)
        .set({ banned: body.banned, updatedAt: Date.now() }, { merge: true });
    } catch (e) {
      console.error("Admin profile.ban PUT update error", {
        scope: "admin.profile_ban",
        type: "firestore_update_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Failed to update ban status", correlationId },
        { status: 500 }
      );
    }

    if (profile.email) {
      try {
        await Notifications.profileBanStatus(profile.email, {
          profile: profile as any,
          banned: !!body.banned,
        });
      } catch (e) {
        console.error("Admin profile.ban PUT notify error", {
          scope: "admin.profile_ban",
          type: "notification_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
        });
      }
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
