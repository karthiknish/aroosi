import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      console.warn("Public profile GET missing userId", {
        scope: "public_profile.get",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { success: false, error: "Missing userId", correlationId },
        { status: 400 }
      );
    }

  const snap = await db.collection("users").doc(userId).get();
  const res = snap.exists ? (snap.data() as any) : null;

    if (!res) {
      console.info("Public profile GET not found", {
        scope: "public_profile.get",
        type: "not_found",
        correlationId,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { success: false, error: "Not found", correlationId },
        { status: 404 }
      );
    }

    console.info("Public profile GET success", {
      scope: "public_profile.get",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      success: true,
      data: { ...res, userId },
      correlationId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Public profile GET unhandled error", {
      scope: "public_profile.get",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { success: false, error: "Failed", correlationId },
      { status: 500 }
    );
  }
}
