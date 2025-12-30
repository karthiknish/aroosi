import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdminInit";
import { hourKey } from "@/lib/tracking";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

// 1x1 transparent PNG (base64)
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWP4////fwAJ+wP+g6l4kQAAAABJRU5ErkJggg==",
  "base64"
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get("cid") || undefined; // campaignId
    const eid = searchParams.get("eid") || undefined; // email hash id

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    // Best-effort rate limit: never block the pixel, only skip writes.
    const rl = checkApiRateLimit(`email_tracking_open_${clientIp}`, 600, 60_000);
    const allowWrite = rl.allowed;

    const isSafeId = (v: string | undefined) =>
      !!v && v.length <= 200 && /^[a-zA-Z0-9._:-]+$/.test(v);

    if (!cid || !eid) {
      return new Response(PIXEL, {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "no-store, max-age=0" },
      });
    }

    if (!isSafeId(cid) || !isSafeId(eid)) {
      return new Response(PIXEL, {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "no-store, max-age=0" },
      });
    }

    if (!allowWrite) {
      return new Response(PIXEL, {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "no-store, max-age=0" },
      });
    }

    const now = Date.now();
    const hour = hourKey(now);
    const ref = adminDb.collection("email_tracking").doc(cid).collection("opens").doc(eid);
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as any) : { count: 0, byHour: {} as Record<string, number>, firstAt: now };
      data.count = (data.count || 0) + 1;
      data.lastAt = now;
      data.byHour[hour] = (data.byHour[hour] || 0) + 1;
      tx.set(ref, data, { merge: true });
    });
  } catch {
    // ignore errors and still return pixel
  }
  return new Response(PIXEL, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store, max-age=0" },
  });
}
