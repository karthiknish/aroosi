import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { convexMutationWithAuth, convexQueryWithAuth } from "@/lib/convexServer";
import { requireSession } from "@/app/api/_utils/auth";

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

    const { messageId, status } =
      (body as { messageId?: string; status?: string }) || {};
    if (!messageId || !status) {
      return NextResponse.json(
        { error: "Missing messageId or status", correlationId },
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

    const receiptId = await convexMutationWithAuth(request, api.deliveryReceipts.recordDeliveryReceipt, {
      messageId: messageId as Id<"messages">,
      userId: userId as Id<"users">,
      status: narrowedStatus,
    }).catch((e: unknown) => {
      console.error("Delivery receipts POST mutation error", {
        scope: "delivery_receipts.post",
        type: "convex_mutation_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return null as any;
    });

    if (!receiptId) {
      return NextResponse.json(
        { error: "Failed to record delivery receipt", correlationId },
        { status: 500 }
      );
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
        receiptId,
        messageId,
        status,
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

    const deliveryReceipts = await convexQueryWithAuth(request, api.deliveryReceipts.getDeliveryReceipts, {
      conversationId: conversationId as Id<"messages">,
    }).catch((e: unknown) => {
      console.error("Delivery receipts GET query error", {
        scope: "delivery_receipts.get",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return null as any;
    });

    if (!deliveryReceipts) {
      return NextResponse.json(
        { error: "Failed to fetch delivery receipts", correlationId },
        { status: 500 }
      );
    }

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
