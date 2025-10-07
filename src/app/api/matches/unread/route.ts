import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

const COLLECTION = "messages";

export const GET = withFirebaseAuth(async (authUser, _req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const userId = authUser.id;
  try {
    // Query messages for the user - use only existing indexes to avoid requiring composite index
    const snap = await db
      .collection(COLLECTION)
      .where("toUserId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    const counts: Record<string, number> = {};
    snap!.docs.forEach((d: any) => {
      const m = d.data() as { fromUserId?: string; readAt?: number | null };
      // Treat missing readAt or explicit null as unread
      if (!m.readAt) {
        const from = m.fromUserId || "unknown";
        counts[from] = (counts[from] || 0) + 1;
      }
    });

    return NextResponse.json(
      { counts, correlationId },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg || "Failed to compute unread counts", correlationId },
      { status: 500 }
    );
  }
});
