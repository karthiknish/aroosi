import { NextRequest } from "next/server";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import { checkApiRateLimit, applySecurityHeaders } from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db, adminAuth } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const admin = await ensureAdmin();
    const rl = checkApiRateLimit(`admin_reports_${admin.id}`, 60, 60_000);
    if (!rl.allowed) return applySecurityHeaders(errorResponse("Rate limit exceeded", 429));
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "pending").toLowerCase();
    let query: FirebaseFirestore.Query = db.collection("reports");
    if (["pending", "reviewed", "resolved"].includes(status)) {
      query = query.where("status", "==", status);
    }
    query = query.orderBy("createdAt", "desc").limit(200);
    const snap = await query.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return applySecurityHeaders(successResponse({ reports: items }));
  } catch {
    return applySecurityHeaders(errorResponse("Failed to fetch reports", 500));
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await ensureAdmin();
    const rl = checkApiRateLimit(`admin_reports_update_${admin.id}`, 60, 60_000);
    if (!rl.allowed) return applySecurityHeaders(errorResponse("Rate limit exceeded", 429));
    const body = await req.json().catch(() => ({}));
    const { id, status, banUser } = (body as any) || {};
    if (!id || typeof id !== "string") return applySecurityHeaders(errorResponse("Missing report id", 400));
    if (!status || !["pending", "reviewed", "resolved"].includes(String(status))) {
      return applySecurityHeaders(errorResponse("Invalid status", 400));
    }
    const ref = db.collection("reports").doc(id);
    const reportSnap = await ref.get();
    if (!reportSnap.exists) return applySecurityHeaders(errorResponse("Report not found", 404));
    const report = reportSnap.data() as any;
    await ref.set({ status: String(status), updatedAt: Date.now(), reviewedBy: admin.id }, { merge: true });
    if (banUser && report?.reportedUserId) {
      const uid = String(report.reportedUserId);
      await db.collection("users").doc(uid).set({ banned: true, updatedAt: Date.now() }, { merge: true });
      try {
        const authUser = await adminAuth.getUser(uid);
        const currentClaims = (authUser.customClaims || {}) as Record<string, unknown>;
        await adminAuth.setCustomUserClaims(uid, { ...currentClaims, banned: true });
        await adminAuth.revokeRefreshTokens(uid);
        try {
          const userSnap = await db.collection("users").doc(uid).get();
          const user = userSnap.data() as any;
          if (user?.email) {
            const { Notifications } = await import("@/lib/notify");
            await Notifications.profileBanStatus(user.email, {
              profile: user,
              banned: true,
              appealUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.aroosi.app"}/banned`,
            });
          }
        } catch {}
      } catch {}
    }
    return applySecurityHeaders(successResponse({ success: true }));
  } catch {
    return applySecurityHeaders(errorResponse("Failed to update report", 500));
  }
}


