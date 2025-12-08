import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { recordUnsubscribe, sign } from "@/lib/unsubscribe";
import { adminDb } from "@/lib/firebaseAdminInit";
import admin from "firebase-admin";
import { hourKey } from "@/lib/tracking";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eid = searchParams.get("eid") || "";
    const sig = searchParams.get("sig") || "";
    const cid = searchParams.get("cid") || undefined;
    const category = searchParams.get("cat") || undefined;
    if (!eid || !sig) return errorResponse("Invalid unsubscribe link", 400);
    const expect = sign(eid);
    if (expect !== sig) return errorResponse("Invalid signature", 400);
    await recordUnsubscribe(eid, "link", cid, category);
    if (cid) {
      const now = Date.now();
      const hour = hourKey(now);
      const ref = adminDb.collection("email_tracking").doc(cid).collection("unsubscribes").doc(eid);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? (snap.data() as any) : { count: 0, byHour: {} as Record<string, number>, firstAt: now };
        data.count = (data.count || 0) + 1;
        data.lastAt = now;
        data.byHour[hour] = (data.byHour[hour] || 0) + 1;
        tx.set(ref, data, { merge: true });
      });
    }
    return successResponse({ ok: true, message: "You've been unsubscribed." });
  } catch (e) {
    return errorResponse("Unexpected error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    // One-click unsubscribe POSTs land here per RFC; extract from query/body
    const { searchParams } = new URL(req.url);
    const eid = searchParams.get("eid") || "";
    const sig = searchParams.get("sig") || "";
    const cid = searchParams.get("cid") || undefined;
    const category = searchParams.get("cat") || undefined;
    if (!eid || !sig) return errorResponse("Invalid unsubscribe request", 400);
    const expect = sign(eid);
    if (expect !== sig) return errorResponse("Invalid signature", 400);
    await recordUnsubscribe(eid, "one-click", cid, category);
    if (cid) {
      const now = Date.now();
      const hour = hourKey(now);
      const ref = adminDb.collection("email_tracking").doc(cid).collection("unsubscribes").doc(eid);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? (snap.data() as any) : { count: 0, byHour: {} as Record<string, number>, firstAt: now };
        data.count = (data.count || 0) + 1;
        data.lastAt = now;
        data.byHour[hour] = (data.byHour[hour] || 0) + 1;
        tx.set(ref, data, { merge: true });
      });
    }
    return successResponse({ ok: true });
  } catch (e) {
    return errorResponse("Unexpected error", 500);
  }
}
