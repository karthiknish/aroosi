import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/firebaseAdmin";

function devLog(level: "info" | "warn" | "error", scope: string, event: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") console[level](`[${scope}] ${event}`, meta);
}

export async function PUT(request: NextRequest) {
  try {
    try {
      await ensureAdmin();
    } catch {
      return errorResponse("Unauthorized", 401);
    }

    const url = new URL(request.url);
    const profileId = url.pathname.split("/").slice(-2, -1)[0];
    if (!profileId) return errorResponse("Missing profileId", 400);

    const body = await request.json().catch(() => ({}));
    const hasSpotlightBadge = Boolean(body?.hasSpotlightBadge);
    const durationDays =
      typeof body?.durationDays === "number"
        ? (body.durationDays as number)
        : undefined;

    const userRef = db.collection("users").doc(profileId);
    const now = Date.now();
    let spotlightExpiresAt: number | null = null;
    if (hasSpotlightBadge && durationDays && durationDays > 0) {
      spotlightExpiresAt = now + durationDays * 24 * 60 * 60 * 1000;
    }
    await userRef.set({ hasSpotlightBadge, spotlightUpdatedAt: now, spotlightExpiresAt }, { merge: true });
    return successResponse({ profileId, hasSpotlightBadge, spotlightExpiresAt });
  } catch (error) {
    devLog("error", "admin.spotlight", "Failed to update spotlight", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Failed to update spotlight", 500, {
      details: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
