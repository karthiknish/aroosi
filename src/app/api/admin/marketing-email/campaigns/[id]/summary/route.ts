import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";
import { adminDb } from "@/lib/firebaseAdminInit";

export async function GET(request: NextRequest, ctx: { params: { id: string } }) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const { id } = ctx.params || ({} as any);
  if (!id) return errorResponse("Missing id", 400);
  try {
    const campaignRef = db.collection("marketing_email_campaigns").doc(id);
    const campaignSnap = await campaignRef.get();
    if (!campaignSnap.exists) return errorResponse("Campaign not found", 404);
    const campaign = { id: campaignSnap.id, ...(campaignSnap.data() as any) };

    // Aggregate email statuses for this campaign
    const maxDocs = 5000;
    const pageSize = 500;
    let fetched = 0;
    let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    const byStatus: Record<string, number> = { queued: 0, sending: 0, retry: 0, sent: 0, error: 0 };
    const byHour: Record<string, number> = {};
    while (fetched < maxDocs) {
      let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
        .collection("emails_outbox")
        .where("metadata.campaignId", "==", id)
        .orderBy("createdAt", "asc")
        .limit(pageSize);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      for (const doc of snap.docs) {
        const d = doc.data() as any;
        const status = String(d.status || "queued");
        byStatus[status] = (byStatus[status] || 0) + 1;
        const ts = Number(d.createdAt || 0);
        if (ts) {
          const hourKey = new Date(Math.floor(ts / 3600000) * 3600000).toISOString();
          byHour[hourKey] = (byHour[hourKey] || 0) + 1;
        }
        fetched += 1;
        if (fetched >= maxDocs) break;
      }
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    // Aggregate opens/clicks from tracking subcollections (bounded scan)
    const trackingTotals = { opens: 0, clicks: 0 };
    const trackingByHour: { opens: Record<string, number>; clicks: Record<string, number> } = { opens: {}, clicks: {} };
    const collections = ["opens", "clicks"] as const;
    for (const coll of collections) {
      const pageSize = 500;
      let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
      let processed = 0;
      while (processed < 5000) {
        let q = adminDb.collection("email_tracking").doc(id).collection(coll).orderBy("firstAt", "asc").limit(pageSize);
        if (last) q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty) break;
        for (const doc of snap.docs) {
          const d = doc.data() as any;
          const count = Number(d.count || 0);
          trackingTotals[coll] += count;
          const byHourMap = (d.byHour || {}) as Record<string, number>;
          for (const [h, c] of Object.entries(byHourMap)) {
            trackingByHour[coll][h] = (trackingByHour[coll][h] || 0) + (c as number);
          }
          processed += 1;
          if (processed >= 5000) break;
        }
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < pageSize) break;
      }
    }

    const totals = {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      queued: byStatus.queued || 0,
      sending: byStatus.sending || 0,
      retry: byStatus.retry || 0,
      sent: byStatus.sent || 0,
      error: byStatus.error || 0,
      opens: trackingTotals.opens,
      clicks: trackingTotals.clicks,
    };

    return successResponse({ campaign, totals, byHour, trackingByHour });
  } catch (e) {
    return errorResponse("Failed to load campaign summary", 500);
  }
}
