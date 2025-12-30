import { NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { hourKey, verifySignedTrackingToken } from "@/lib/tracking";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get("cid") || undefined; // campaignId
  const eid = searchParams.get("eid") || undefined; // email hash id
  const token = searchParams.get("t") || "";
  const legacyTarget = searchParams.get("url") || "";

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  // Best-effort rate limit: never block the redirect, only skip writes.
  const rl = checkApiRateLimit(`email_tracking_click_${clientIp}`, 300, 60_000);
  const allowWrite = rl.allowed;

  const allowedLegacyHosts = new Set([
    "aroosi.app",
    "www.aroosi.app",
    "aroosi-project.web.app",
    "aroosi-project.firebaseapp.com",
    "localhost:3000",
  ]);

  const resolved = token
    ? await verifySignedTrackingToken(token)
    : null;

  const targetUrl = resolved?.url || legacyTarget;
  let u: URL | null = null;
  try {
    u = new URL(targetUrl);
  } catch {
    u = null;
  }
  if (!u) return new Response("Bad Request", { status: 400 });

  // Only allow arbitrary redirects if signed; legacy mode is allowlist-only.
  if (!resolved && !allowedLegacyHosts.has(u.host)) {
    return new Response("Bad Request", { status: 400 });
  }

  if (u.protocol !== "https:" && u.host !== "localhost:3000") {
    return new Response("Bad Request", { status: 400 });
  }

  // Disallow credentials
  if (u.username || u.password) {
    return new Response("Bad Request", { status: 400 });
  }
  // Record click but don't block redirect on failure
  try {
    if (allowWrite && cid && eid) {
      const now = nowTimestamp();
      const hour = hourKey(now);
      const ref = db.collection("email_tracking").doc(cid).collection("clicks").doc(eid);
      await db.runTransaction(async (tx: any) => {
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
