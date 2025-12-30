import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import { adminStorage, db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

function json(data: unknown, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = nowTimestamp();

  try {
    await ensureAdmin();
  } catch {
    return json({ error: "Unauthorized", correlationId }, 401);
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // .../api/admin/profiles/[id]/images/[imageId]
  const idIndex = parts.indexOf("profiles") + 1;
  const imageIndex = parts.indexOf("images") + 1;
  const profileId = parts[idIndex] || "";
  const imageId = parts[imageIndex] || "";

  if (!profileId || !imageId) {
    return json(
      { error: "Missing profileId or imageId", correlationId },
      400
    );
  }

  try {
    // Construct storage path. Common patterns:
    // - users/{userId}/profile-images/{imageId}
    // - users/{userId}/{imageId}
    const candidates = [
      `users/${profileId}/profile-images/${imageId}`,
      `users/${profileId}/${imageId}`,
    ];

    let deletedStorage = false;
    let lastError: unknown = null;
    for (const path of candidates) {
      try {
        await adminStorage.bucket().file(path).delete({ ignoreNotFound: true });
        deletedStorage = true;
        break;
      } catch (e) {
        lastError = e;
      }
    }

    // Remove Firestore metadata if present
    try {
      await db
        .collection("users")
        .doc(profileId)
        .collection("images")
        .doc(imageId)
        .delete();
    } catch {}

    if (!deletedStorage && lastError) {
      console.error("admin delete image storage error", {
        correlationId,
        error: String(lastError),
        profileId,
        imageId,
      });
      return json({ error: "Failed to delete image", correlationId }, 500);
    }

    return json(
      {
        success: true,
        correlationId,
        durationMs: nowTimestamp() - startedAt,
      },
      200
    );
  } catch (e) {
    console.error("admin delete image unhandled error", {
      correlationId,
      error: e instanceof Error ? e.message : String(e),
      profileId,
      imageId,
    });
    return json({ error: "Internal server error", correlationId }, 500);
  }
}


