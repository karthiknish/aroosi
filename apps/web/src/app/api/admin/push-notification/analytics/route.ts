import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { role } = await requireAuth(request);
    if ((role || "user") !== "admin")
      return errorResponse("Admin privileges required", 403);
  } catch {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const snap = await db.collection("pushTokens").limit(5000).get();
    const docs = snap.docs.map((d: any) => d.data() as any);

    const totalDevices = docs.length;
    const activeDocs = docs.filter((d: any) => d?.isActive === true);
    const activeDevices = activeDocs.length;

    const normalizeType = (d: any): "ios" | "android" | "web" => {
      const t = String(d?.deviceType || d?.platform || "web").toLowerCase();
      if (t.includes("ios")) return "ios";
      if (t.includes("android")) return "android";
      return "web";
    };

    let iosDevices = 0;
    let androidDevices = 0;
    let webDevices = 0;

    for (const d of activeDocs) {
      const t = normalizeType(d);
      if (t === "ios") iosDevices++;
      else if (t === "android") androidDevices++;
      else webDevices++;
    }

    // Recent push sends: approximate count from latest docs.
    // We store push sends in adminSends (see /api/admin/push-notification).
    const sinceMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSnap = await db
      .collection("adminSends")
      .where("type", "==", "push")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const recentNotifications = recentSnap.docs.filter((d: any) => {
      const createdAt = (d.data() as any)?.createdAt;
      return typeof createdAt === "number" && createdAt >= sinceMs;
    }).length;

    return successResponse({
      totalDevices,
      activeDevices,
      iosDevices,
      androidDevices,
      webDevices,
      recentNotifications,
    });
  } catch (err) {
    console.error("push analytics error", err);
    return errorResponse("Failed to fetch analytics", 500);
  }
}
