import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const status = 403;
    devLog("warn", "admin.matches", "auth_failed", {
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Admin privileges required", correlationId },
      { status }
    );
  }
  try {
    const matchesSnap = await db.collection("matches").get();
    const matches = matchesSnap.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));
    devLog("info", "admin.matches", "success", {
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      count: matches.length,
    });
    return NextResponse.json(
      { success: true, matches, correlationId },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    devLog("error", "admin.matches", "unhandled_error", {
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      message,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches", correlationId },
      { status: 500 }
    );
  }
}
