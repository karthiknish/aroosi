import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = nowTimestamp();
  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const status = 403;
    const body = { error: "Admin privileges required", correlationId };
    devLog("warn", "admin.interests", "auth_failed", {
      correlationId,
      statusCode: status,
      durationMs: nowTimestamp() - startedAt,
    });
    return NextResponse.json(body, { status });
  }
  try {
    const snap = await db.collection("interests").get();
    const interests = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    devLog("info", "admin.interests", "success", {
      correlationId,
      statusCode: 200,
      durationMs: nowTimestamp() - startedAt,
      count: interests.length,
    });
    return NextResponse.json(
      { success: true, interests, correlationId },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    devLog("error", "admin.interests", "unhandled_error", {
      correlationId,
      statusCode: 500,
      durationMs: nowTimestamp() - startedAt,
      message,
    });
    return NextResponse.json(
      { error: "Failed to fetch interests", correlationId },
      { status: 500 }
    );
  }
}
