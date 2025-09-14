import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebaseAdminInit";
import { hourKey } from "@/lib/tracking";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get("cid") || undefined; // campaignId
  const eid = searchParams.get("eid") || undefined; // email hash id
  const target = searchParams.get("url") || "";
  const u = (() => {
    try {
      return new URL(target);
    } catch {
      return null;
    }
  })();
  if (!u) {
    return new Response("Bad Request", { status: 400 });
  }
  // Record click but don't block redirect on failure
  try {
    if (cid && eid) {
      const now = Date.now();
      const hour = hourKey(now);
      const ref = adminDb.collection("email_tracking").doc(cid).collection("clicks").doc(eid);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? (snap.data() as any) : { count: 0, byHour: {} as Record<string, number>, firstAt: now };
        data.count = (data.count || 0) + 1;
        data.lastAt = now;
        data.byHour[hour] = (data.byHour[hour] || 0) + 1;
        tx.set(ref, data, { merge: true });
      });
    }
  } catch {}

  // Finally redirect to the target URL
  return Response.redirect(u.toString(), 302);
}
