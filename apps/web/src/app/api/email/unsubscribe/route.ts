import { NextRequest, NextResponse } from "next/server";
import { 
  createApiHandler, 
  successResponse, 
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { recordUnsubscribe } from "@/lib/unsubscribe";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { hourKey } from "@/lib/tracking";

async function handleUnsubscribe(ctx: ApiContext, method: "link" | "one-click") {
  const { searchParams } = ctx.request.nextUrl;
  const eid = searchParams.get("eid") || "";
  const cid = searchParams.get("cid") || undefined;
  const category = searchParams.get("cat") || "marketing";

  if (!eid) {
    return errorResponse("Missing email ID", 400, { correlationId: ctx.correlationId });
  }

  try {
    await recordUnsubscribe(eid, method, cid, category);
    
    if (cid) {
      const now = nowTimestamp();
      const hour = hourKey(now);
      const ref = db.collection("email_tracking").doc(cid).collection("unsubscribes").doc(eid);
      
      await db.runTransaction(async (tx: any) => {
        const doc = await tx.get(ref);
        if (doc.exists) return;

        tx.set(ref, {
          timestamp: now,
          hour,
          method,
          category,
        });

        const campaignRef = db.collection("email_tracking").doc(cid);
        tx.set(campaignRef, {
          unsubscribes: (db as any).FieldValue.increment(1),
          updatedAt: now,
        }, { merge: true });
      });
    }

    return successResponse({ ok: true }, 200, ctx.correlationId);
  } catch (err) {
    console.error("Unsubscribe error", err);
    return errorResponse("Failed to process unsubscribe", 500, { correlationId: ctx.correlationId });
  }
}

export const GET = createApiHandler(async (ctx: ApiContext) => {
  return handleUnsubscribe(ctx, "link");
});

export const POST = createApiHandler(async (ctx: ApiContext) => {
  return handleUnsubscribe(ctx, "one-click");
});
