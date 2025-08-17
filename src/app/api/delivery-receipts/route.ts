import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";
import {
  COL_MESSAGE_RECEIPTS,
  buildMessageReceipt,
  messageReceiptId,
} from "@/lib/firestoreSchema";

const VALID_STATUSES = ["delivered", "read", "failed"] as const;

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      const res = session.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      console.warn("Delivery receipts POST auth failed", {
        scope: "delivery_receipts.post",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }
    const { userId } = session;

    // Cookie/session auth; use server helper

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body", correlationId },
        { status: 400 }
      );
    }

    const { messageId, conversationId, status } =
      (body as {
        messageId?: string;
        conversationId?: string;
        status?: string;
      }) || {};
    if (!messageId || !conversationId || !status) {
      return NextResponse.json(
        { error: "Missing messageId, conversationId or status", correlationId },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json(
        { error: "Invalid status", correlationId },
        { status: 400 }
      );
    }

    // Narrow status to the allowed literal union type
    const narrowedStatus = status as "delivered" | "read" | "failed";

    // Upsert Firestore receipt (one per messageId_userId)
    const receiptDocId = messageReceiptId(messageId, userId!);
    const existing = await db
      .collection(COL_MESSAGE_RECEIPTS)
      .doc(receiptDocId)
      .get();
    const now = Date.now();
    if (existing.exists) {
      const data = existing.data() as any;
      const updates: any = { status: narrowedStatus, updatedAt: now };
      if (narrowedStatus === "delivered" && !data.deliveredAt)
        updates.deliveredAt = now;
      if (narrowedStatus === "read" && !data.readAt) updates.readAt = now;
      await db
        .collection(COL_MESSAGE_RECEIPTS)
        .doc(receiptDocId)
        .set(updates, { merge: true });
    } else {
      const base = buildMessageReceipt(
        messageId,
        conversationId,
        userId!,
        narrowedStatus
      );
      if (narrowedStatus === "delivered") base.deliveredAt = base.updatedAt;
      if (narrowedStatus === "read") base.readAt = base.updatedAt;
      await db.collection(COL_MESSAGE_RECEIPTS).doc(receiptDocId).set(base);
    }

    // Failure sampling / alert hook
    if (narrowedStatus === "failed") {
      // Simple 10% sampling rate to avoid log flood
      if (Math.random() < 0.1) {
        console.warn("Delivery receipt failure sampled", {
          scope: "delivery_receipts.post",
          type: "receipt_failed_sampled",
          correlationId,
          messageId,
          conversationId,
          userId,
          sampled: true,
          durationMs: Date.now() - startedAt,
        });
      } else {
        console.warn("Delivery receipt failure", {
          scope: "delivery_receipts.post",
          type: "receipt_failed",
          correlationId,
          messageId,
          conversationId,
          userId,
          sampled: false,
          durationMs: Date.now() - startedAt,
        });
      }
    }

    console.info("Delivery receipts POST success", {
      scope: "delivery_receipts.post",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Delivery receipt recorded",
        receiptId: receiptDocId,
        messageId,
        status,
        conversationId,
        timestamp: Date.now(),
        correlationId,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Delivery receipts POST unhandled error", {
      scope: "delivery_receipts.post",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to record delivery receipt", correlationId },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      const res = session.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      console.warn("Delivery receipts GET auth failed", {
        scope: "delivery_receipts.get",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }

    // Cookie/session auth; use server helper

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId", correlationId },
        { status: 400 }
      );
    }

    // Query receipts by indexed conversationId field (more robust than messageId prefix)
    const snap = await db
      .collection(COL_MESSAGE_RECEIPTS)
      .where("conversationId", "==", conversationId)
      .limit(500)
      .get();
    const deliveryReceipts = snap.docs.map(
      (
        d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
      ) => ({ id: d.id, ...(d.data() as any) })
    );

    console.info("Delivery receipts GET success", {
      scope: "delivery_receipts.get",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      count: Array.isArray(deliveryReceipts)
        ? deliveryReceipts.length
        : undefined,
    });
    return NextResponse.json(
      { success: true, conversationId, deliveryReceipts, correlationId },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Delivery receipts GET unhandled error", {
      scope: "delivery_receipts.get",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to fetch delivery receipts", correlationId },
      { status: 500 }
    );
  }
}
