import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

async function countCollection(col: string): Promise<number> {
  try {
    // Try aggregation count API if available
    const snap: any = await (db as any).collection(col).count?.().get?.();
    if (snap && typeof snap.data === "function") {
      const data = snap.data();
      if (data && typeof data.count === "number") return data.count;
    }
    // Fallback: limited scan (up to 5k docs)
    const legacy = await db.collection(col).limit(5000).get();
    return legacy.size;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const session = await requireAdminSession(req);
  if ("errorResponse" in session) return session.errorResponse;
  try {
    const [
      totalUsers,
      totalMatches,
      messagesCount,
      contactMessages,
      blogPosts,
    ] = await Promise.all([
      // Count user profiles from the canonical users collection
      countCollection("users"),
      countCollection("matches"),
      countCollection("messages"),
      countCollection("contactSubmissions"),
      countCollection("blogPosts"),
    ]);

    // Active users: distinct senderId in messages last 30 days
    const THIRTY_DAYS = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let activeUsers = 0;
    try {
      const activitySnap = await db
        .collection("messages")
        .where("createdAt", ">=", THIRTY_DAYS)
        .select("senderId")
        .limit(5000)
        .get();
      const ids = new Set<string>();
      activitySnap.forEach((d: any) => {
        const data = d.data();
        if (data?.senderId) ids.add(String(data.senderId));
      });
      activeUsers = ids.size;
    } catch {}

    // New registrations last 7 days (users collection)
    let newRegistrations = 0;
    try {
      const sevenDays = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const newSnap = await db
        .collection("users")
        .where("createdAt", ">=", sevenDays)
        .select("createdAt")
        .limit(5000)
        .get();
      newRegistrations = newSnap.size;
    } catch {}

    // Pending approvals: users where needsApproval == true (if field exists)
    let approvalsPending = 0;
    try {
      const pendingSnap = await db
        .collection("users")
        .where("needsApproval", "==", true)
        .limit(5000)
        .get();
      approvalsPending = pendingSnap.size;
    } catch {}

    const payload = {
      totalUsers,
      activeUsers,
      totalMatches,
      messagesCount,
      newRegistrations,
      contactMessages,
      blogPosts,
      approvalsPending,
      generatedAt: Date.now(),
      durationMs: Date.now() - startedAt,
    };
    devLog?.("info", "admin.dashboard", "success", payload as any);
    return NextResponse.json({ success: true, stats: payload });
  } catch (e) {
    devLog?.("error", "admin.dashboard", "unhandled_error", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
