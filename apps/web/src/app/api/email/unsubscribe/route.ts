import {
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { recordUnsubscribe, sign } from "@/lib/unsubscribe";
import { adminDb } from "@/lib/firebaseAdminInit";
import { hourKey } from "@/lib/tracking";

async function handleUnsubscribe(ctx: ApiContext, method: "link" | "one-click") {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const eid = searchParams.get("eid") || "";
    const sig = searchParams.get("sig") || "";
    const cid = searchParams.get("cid") || undefined;
    const category = searchParams.get("cat") || undefined;
    
    if (!eid || !sig) {
      return errorResponse("Invalid unsubscribe link", 400, { correlationId: ctx.correlationId });
    }
    
    const expect = sign(eid);
    if (expect !== sig) {
      return errorResponse("Invalid signature", 400, { correlationId: ctx.correlationId });
    }
    
    await recordUnsubscribe(eid, method, cid, category);
    
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
    
    return successResponse({
      ok: true,
      message: method === "link" ? "You've been unsubscribed." : undefined,
    }, 200, ctx.correlationId);
  } catch (error) {
    console.error("email/unsubscribe error", { error, correlationId: ctx.correlationId });
    return errorResponse("Unexpected error", 500, { correlationId: ctx.correlationId });
  }
}

export const GET = createApiHandler(
  async (ctx: ApiContext) => handleUnsubscribe(ctx, "link"),
  {
    requireAuth: false,
    rateLimit: { identifier: "email_unsubscribe", maxRequests: 30 }
  }
);

export const POST = createApiHandler(
  async (ctx: ApiContext) => handleUnsubscribe(ctx, "one-click"),
  {
    requireAuth: false,
    rateLimit: { identifier: "email_unsubscribe", maxRequests: 30 }
  }
);
