import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { adminFieldValue } from "@/lib/firebaseAdminInit";
import {
  createInAppNotification,
  sendFcmNotificationToTokens,
} from "@/lib/notifications/firebaseNotifications";

function dayKey(ts: number = Date.now()) {
  const d = new Date(ts);
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

/**
 * POST  /api/profile/view
 * Body: { profileId: string }
 * Records that the authenticated user viewed the given profile.
 */
export const POST = withFirebaseAuth(async (user, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const body = await request.json().catch(() => ({}) as any);
    const { profileId } = (body ?? {}) as { profileId?: string };
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "Missing profileId", correlationId },
        { status: 400 }
      );
    }
    if (profileId === user.id) {
      return NextResponse.json({ success: true, correlationId, ignored: true });
    }
    await db.collection("profileViews").add({
      profileId,
      viewerId: user.id,
      createdAt: Date.now(),
    });
    // Increment aggregate counter on target profile (stored on user doc for now)
    const targetRef = db.collection("users").doc(profileId);
    await targetRef
      .set({ totalProfileViews: adminFieldValue.increment(1) }, { merge: true })
      .catch(() => {});
    // Optional notification: only if target user has premiumPlus plan (simulate premium feature)
    const targetDoc = await targetRef.get();
    const targetData = targetDoc.exists ? (targetDoc.data() as any) : null;
    const isPremiumPlus = targetData?.subscriptionPlan === "premiumPlus";
    if (isPremiumPlus) {
      // Rate limit: once per viewer per day per target
      const dk = dayKey();
      const rlId = `${profileId}_${user.id}_${dk}`;
      const rlRef = db.collection("profileViewNotifsSent").doc(rlId);
      const rlSnap = await rlRef.get();
      if (!rlSnap.exists) {
        await rlRef.set({
          targetUserId: profileId,
          viewerId: user.id,
          dayKey: dk,
          createdAt: Date.now(),
        });
        await createInAppNotification({
          userId: profileId,
          type: "profile_view",
          title: "Your profile was viewed",
          body: "Someone just viewed your profile",
          data: { viewerId: user.id },
        });
        const tokenSnap = await db
          .collection("pushTokens")
          .where("userId", "==", profileId)
          .where("isActive", "==", true)
          .get();
        const tokens = tokenSnap.docs
          .map((d: any) => (d.data() as any).token)
          .filter(Boolean);
        if (tokens.length) {
          await sendFcmNotificationToTokens(
            tokens,
            "Profile viewed",
            "Someone viewed your profile",
            { viewerId: user.id }
          );
        }
      }
    }
    return NextResponse.json({ success: true, correlationId });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to record view",
        correlationId,
      },
      { status: 400 }
    );
  }
});

/**
 * GET  /api/profile/view?profileId=xyz
 * Returns the list of viewers for the given profile (Premium Plus owner only).
 */
export const GET = withFirebaseAuth(async (user, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");
    const mode = searchParams.get("mode");
    const limit = parseInt(searchParams.get("limit") || "0", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "Missing profileId", correlationId },
        { status: 400 }
      );
    }
    // Authorization: users can view their own viewers only
    if (profileId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden", correlationId },
        { status: 403 }
      );
    }
    const snap = await db
      .collection("profileViews")
      .where("profileId", "==", profileId)
      .orderBy("createdAt", "desc")
      .get();
    const rows = snap.docs.map((d: any) => d.data() as any);
    if (mode === "count") {
      return NextResponse.json({
        success: true,
        count: rows.length,
        correlationId,
      });
    }
    const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
    const end = Number.isFinite(limit) && limit > 0 ? start + limit : undefined;
    const slice = rows.slice(start, end);
    // Enrich with viewer profile basics
    const viewers = await Promise.all(
      slice.map(async (r: any) => {
        const uDoc = await db.collection("users").doc(r.viewerId).get();
        const u = uDoc.exists ? uDoc.data() : {};
        return {
          viewerId: r.viewerId,
          fullName: u?.fullName,
          profileImageUrls: u?.profileImageUrls || [],
          viewedAt: r.createdAt,
        };
      })
    );
    return NextResponse.json({
      success: true,
      viewers,
      total: rows.length,
      correlationId,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch viewers",
        correlationId,
      },
      { status: 400 }
    );
  }
});
