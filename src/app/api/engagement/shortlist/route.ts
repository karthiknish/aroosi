import { NextRequest } from "next/server";
import { z } from "zod";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import {
  createInAppNotification,
  sendFcmNotificationToTokens,
} from "@/lib/notifications/firebaseNotifications";
import {
  applySecurityHeaders,
  validateSecurityRequirements,
} from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse, errorResponsePublic } from "@/lib/apiResponse";

const toggleSchema = z.object({ toUserId: z.string().min(1) });

export const GET = withFirebaseAuth(async (user, _req: NextRequest) => {
  try {
    const snap = await db
      .collection("shortlists")
      .where("fromUserId", "==", user.id)
      .get();
    const basic: Array<{ id: string; toUserId: string; createdAt: number }> =
      snap.docs.map((d: any) => {
        const data = d.data() as any;
        return {
          id: d.id,
          toUserId: data.toUserId as string,
          createdAt: (data.createdAt as number) || Date.now(),
        };
      });
    // Enrich with profile basics
    const uniqueIds = Array.from(new Set(basic.map((r) => r.toUserId)));
    const profileSnaps = await Promise.all(
      uniqueIds.map((uid) => db.collection("users").doc(uid).get())
    );
    const profileMap = new Map(
      profileSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as any])
    );
    const enriched = basic.map((r: { toUserId: string; createdAt: number }) => {
      const p = profileMap.get(r.toUserId) || {};
      return {
        // Maintain legacy shape expected by fetchShortlists(): userId not toUserId
        userId: r.toUserId,
        createdAt: r.createdAt,
        fullName: p.fullName || null,
        profileImageUrls: p.profileImageUrls || null,
      };
    });
    return applySecurityHeaders(successResponse(enriched));
  } catch (e: any) {
    return applySecurityHeaders(errorResponse(e?.message || "Failed", 500));
  }
});

export const POST = withFirebaseAuth(async (user, req: NextRequest) => {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid)
    return applySecurityHeaders(
      errorResponse(sec.error ?? "Invalid request", 400)
    );
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(
      errorResponsePublic("Invalid request data", 422)
    );
  }
  const { toUserId } = parsed.data;
  if (toUserId === user.id)
    return applySecurityHeaders(
      errorResponsePublic("You can't shortlist yourself", 400)
    );
  try {
    const existingSnap = await db
      .collection("shortlists")
      .where("fromUserId", "==", user.id)
      .where("toUserId", "==", toUserId)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      // toggle off (remove)
      await existingSnap.docs[0].ref.delete();
      return applySecurityHeaders(
        successResponse({ success: true, removed: true })
      );
    }
    // Plan limit enforcement (mirror legacy: free 20, premium 200, premiumPlus unlimited)
    const profileDoc = await db.collection("users").doc(user.id).get();
    const plan =
      (profileDoc.exists && (profileDoc.data() as any).subscriptionPlan) ||
      "free";
    const limit =
      plan === "premiumPlus" ? Infinity : plan === "premium" ? 200 : 20;
    if (Number.isFinite(limit)) {
      const countSnap = await db
        .collection("shortlists")
        .where("fromUserId", "==", user.id)
        .get();
      if (countSnap.size >= limit) {
        return applySecurityHeaders(
          errorResponsePublic(
            "You've reached your shortlist limit. Upgrade your plan to add more.",
            400,
            { limit }
          )
        );
      }
    }
    await db.collection("shortlists").add({
      fromUserId: user.id,
      toUserId,
      createdAt: Date.now(),
    });
    // Fetch sender details for enrichment
    const fromDoc = await db.collection("users").doc(user.id).get();
    const fromData = fromDoc.exists ? (fromDoc.data() as any) : {};
    const senderName = fromData.fullName || "Someone";
    const senderImageRaw =
      Array.isArray(fromData.profileImageUrls) &&
      fromData.profileImageUrls.length > 0
        ? fromData.profileImageUrls[0]
        : undefined;
    const notificationData: Record<string, any> = {
      fromUserId: user.id,
      senderName,
    };
    if (senderImageRaw) notificationData.senderImage = senderImageRaw;
    // Fetch target user's push tokens
    const tokenSnap = await db
      .collection("pushTokens")
      .where("userId", "==", toUserId)
      .where("isActive", "==", true)
      .get();
    const tokens = tokenSnap.docs
      .map((d: any) => (d.data() as any).token)
      .filter(Boolean);
    // Create notification doc
    await createInAppNotification({
      userId: toUserId,
      type: "shortlist",
      title: `${senderName} shortlisted you`,
      body: "You were added to a shortlist",
      data: notificationData,
    });
    if (tokens.length) {
      await sendFcmNotificationToTokens(
        tokens,
        "New shortlist",
        `${senderName} shortlisted you`,
        { fromUserId: user.id }
      );
    }
    return applySecurityHeaders(
      successResponse({ success: true, added: true, notified: tokens.length })
    );
  } catch (e: any) {
    // Map common Firestore / permission issues to user-friendly messages
    const raw = (e?.message || "").toLowerCase();
    let friendly = "Couldn't update shortlist. Please try again.";
    if (raw.includes("permission") || raw.includes("missing or insufficient permissions")) {
      friendly = "You don't have permission to do that.";
    } else if (raw.includes("quota") || raw.includes("resource exhausted")) {
      friendly = "Shortlist temporarily unavailable. Please try again soon.";
    }
    return applySecurityHeaders(errorResponsePublic(friendly, 500));
  }
});


