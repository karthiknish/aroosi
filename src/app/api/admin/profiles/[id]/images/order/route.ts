// Admin API route for reordering profile images by profileId
import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/firebaseAdmin";

function devLog(
  level: "info" | "warn" | "error",
  scope: string,
  event: string,
  meta: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "production")
    console[level](`[${scope}] ${event}`, meta);
}

export async function POST(req: NextRequest) {
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    devLog("warn", "admin.profile_images_order", "invalid_json", {
      correlationId,
      statusCode: 400,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Invalid JSON body", correlationId },
      { status: 400 }
    );
  }
  const { imageIds } = body as { imageIds?: unknown };
  const url = req.nextUrl || new URL(req.url);
  const segments = url.pathname.split("/");
  const profilesIdx = segments.findIndex((s) => s === "profiles");
  const profileId = profilesIdx !== -1 ? segments[profilesIdx + 1] : undefined;
  if (
    !profileId ||
    !Array.isArray(imageIds) ||
    (imageIds as unknown[]).some((id) => typeof id !== "string")
  ) {
    devLog("warn", "admin.profile_images_order", "validation_error", {
      correlationId,
      statusCode: 400,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Missing or invalid profileId or imageIds", correlationId },
      { status: 400 }
    );
  }
  try {
    // Store order as an array field on user doc or subcollection metadata; choose main doc for simplicity.
    await db
      .collection("users")
      .doc(profileId)
      .set(
        { profileImageIds: imageIds, updatedAt: Date.now() },
        { merge: true }
      );
    devLog("info", "admin.profile_images_order", "success", {
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      profileId,
      count: (imageIds as string[]).length,
    });
    return NextResponse.json({ success: true, correlationId }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    devLog("error", "admin.profile_images_order", "unhandled_error", {
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to reorder images", correlationId },
      { status: 500 }
    );
  }
}
 