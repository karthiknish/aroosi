import { NextRequest, NextResponse } from "next/server";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

// GET unread message counts per otherUser for current user (Firestore implementation)
export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(req);
    if ("errorResponse" in session) {
      const res = session.errorResponse as Response;
      return new NextResponse(await res.text(), { status: res.status });
    }
    const { userId } = session;

    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      req,
      "",
      String(userId),
      "unread_counts",
      60_000
    );
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: rate.error || "Rate limit exceeded",
          correlationId,
          plan: rate.plan,
          limit: rate.limit,
          remaining: rate.remaining,
          resetTime: new Date(rate.resetTime).toISOString(),
        },
        { status: 429 }
      );
    }

    // Query unread messages directed to current user
    const snap = await db
      .collection("messages")
      .where("toUserId", "==", userId)
      .where("readAt", "==", null)
      .get();
    const counts: Record<string, number> = {};
    snap.docs.forEach((d: any) => {
      const msg = d.data();
      const other = msg.fromUserId as string;
      counts[other] = (counts[other] || 0) + 1;
    });

    console.info("Matches unread GET success", {
      scope: "matches.unread",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { success: true, counts, correlationId },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Matches unread GET unhandled error", {
      scope: "matches.unread",
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
