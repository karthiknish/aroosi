import { NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { hourKey } from "@/lib/tracking";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cid = searchParams.get("cid");
  const eid = searchParams.get("eid");

  if (!cid || !eid) {
    return new Response(null, { status: 400 });
  }

  // Basic rate limiting for open tracking
  const rl = checkApiRateLimit(`email_open_${cid}`, 500, 60000);
  if (!rl.allowed) {
    return new Response(null, { status: 429 });
  }

  try {
    const now = nowTimestamp();
    const hour = hourKey(now);
    const ref = db.collection("email_tracking").doc(cid).collection("opens").doc(eid);
    
    await db.runTransaction(async (tx: any) => {
      const doc = await tx.get(ref);
      if (doc.exists) return; // already tracked

      tx.set(ref, {
        timestamp: now,
        hour,
        userAgent: req.headers.get("user-agent") || "unknown",
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      });

      // Update aggregations
      const campaignRef = db.collection("email_tracking").doc(cid);
      tx.set(campaignRef, {
        opens: (db as any).FieldValue.increment(1),
        updatedAt: now,
      }, { merge: true });

      const hourRef = campaignRef.collection("hourly_stats").doc(hour);
      tx.set(hourRef, {
        opens: (db as any).FieldValue.increment(1),
        updatedAt: now,
      }, { merge: true });
    });
  } catch (e) {
    console.error("Failed to track email open", e);
  }

  // Still return the transparent pixel even if tracking failed
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  return new Response(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
