import { NextRequest, NextResponse } from "next/server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

function devLog(
  level: "info" | "warn" | "error",
  scope: string,
  event: string,
  meta: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "production")
    console[level](`[${scope}] ${event}`, meta);
}

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = nowTimestamp();

  try {
    await ensureAdmin();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", correlationId },
      { status: 401 }
    );
  }

  try {
  const profileId = req.nextUrl.pathname.split("/").slice(-2)[0] as string;
  const snap = await db
    .collection("matches")
    .where("participants", "array-contains", profileId)
    .limit(500)
    .get();
  const matches = snap.docs.map(
    (d: QueryDocumentSnapshot): Record<string, unknown> => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    })
  );

    devLog("info", "admin.profile_matches", "success", { correlationId, statusCode: 200, durationMs: nowTimestamp() - startedAt });
  return NextResponse.json(
    { success: true, matches, correlationId },
    { status: 200 }
  );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    devLog("error", "admin.profile_matches", "unhandled_error", { message, correlationId, statusCode: 500, durationMs: nowTimestamp() - startedAt });
    return NextResponse.json({ error: "Failed", correlationId }, { status: 500 });
  }
}
