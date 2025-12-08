import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  return withFirebaseAuth(async (user: AuthenticatedUser) => {
    try {
      let status = "online";
      try {
        const body = await request.json();
        if (body && typeof body.status === "string") status = body.status;
      } catch {
        // no body provided (keepalive) -> default to online
      }

      await db.collection("presence").doc(user.id).set(
        {
          userId: user.id,
          lastSeen: Date.now(),
          status: status,
        },
        { merge: true }
      );
      return new NextResponse(null, { status: 204 });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "presence update failed" },
        { status: 500 }
      );
    }
  })(request);
}

// Optional: handle preflight if needed
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
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
          data: { isOnline: false, lastSeen: 0 },
        });

      const presenceData = doc.data() as any;
      const lastSeen = presenceData?.lastSeen || 0;
      const status = presenceData?.status || "offline";
      const now = Date.now();

      // User is online if:
      // 1. Status is explicitly "online" AND
      // 2. Last seen within 30 seconds (recent activity)
      const isOnline = status === "online" && now - lastSeen < 30 * 1000;

      return NextResponse.json({
        success: true,
        data: { isOnline, lastSeen },
      });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "presence query failed" },
        { status: 500 }
      );
    }
  })(request);
}


