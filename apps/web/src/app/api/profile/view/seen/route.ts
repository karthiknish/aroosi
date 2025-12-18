import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

/**
 * POST  /api/profile/view/seen
 * Marks all profile viewers as seen by updating the user's lastSeenViewersAt timestamp.
 */
export async function POST(req: NextRequest) {
  return withFirebaseAuth(async (user, _request: NextRequest, _ctx) => {
    const correlationId = Math.random().toString(36).slice(2, 10);
    try {
      await db.collection("users").doc(user.id).set(
        { lastSeenViewersAt: Date.now() },
        { merge: true }
      );

      return NextResponse.json({ success: true, correlationId });
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: err?.message || "Failed to mark viewers as seen",
          correlationId,
        },
        { status: 400 }
      );
    }
  })(req, {});
}
