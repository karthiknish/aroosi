import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  return withFirebaseAuth(async (user: AuthenticatedUser) => {
    try {
      await db.collection("presence").doc(user.id).set(
        {
          userId: user.id,
          lastSeen: Date.now(),
          status: "online",
        },
        { merge: true }
      );
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "presence update failed" },
        { status: 500 }
      );
    }
  })(request);
}

export async function GET(request: NextRequest) {
  return withFirebaseAuth(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      if (!userId)
        return NextResponse.json(
          { success: false, error: "Missing userId" },
          { status: 400 }
        );
      const doc = await db.collection("presence").doc(userId).get();
      if (!doc.exists)
        return NextResponse.json({
          success: true,
          data: { userId, status: "offline" },
        });
      return NextResponse.json({ success: true, data: doc.data() });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "presence query failed" },
        { status: 500 }
      );
    }
  })(request);
}


