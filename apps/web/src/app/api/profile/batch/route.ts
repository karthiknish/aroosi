import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    await requireAuth(req);
    const { userIds } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const results = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const snap = await db.collection("users").doc(userId).get();
          if (snap.exists) return { userId, profile: snap.data() };
        } catch (e) {
          console.error(`Error fetching profile for userId ${userId}:`, e);
        }
        return null;
      })
    );

    return NextResponse.json(results.filter(Boolean), { status: 200 });
  } catch (err: any) {
    const status = err instanceof AuthError ? err.status : 400;
    const error = err instanceof AuthError ? err.message : (err?.message || "Failed to fetch profiles");
    const code = err instanceof AuthError ? err.code : err?.code;
    return NextResponse.json({ success: false, error, code, correlationId }, { status });
  }
}
