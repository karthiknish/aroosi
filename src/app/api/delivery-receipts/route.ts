import { NextRequest } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/delivery-receipts?conversationId=...
export const GET = withFirebaseAuth(async (_authUser, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "conversationId is required" }),
        { status: 400 }
      );
    }

    // Fetch receipts for the conversation (denormalized conversationId stored on receipts)
    const snap = await db
      .collection("messageReceipts")
      .where("conversationId", "==", conversationId)
      .get();

    const deliveryReceipts = snap.docs.map((d: any) => {
      const data = d.data() || {};
      return {
        id: d.id,
        messageId: data.messageId,
        userId: data.userId,
        status: data.status,
        updatedAt: data.updatedAt || data.timestamp || Date.now(),
      };
    });

    return new Response(JSON.stringify({ deliveryReceipts }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GET /api/delivery-receipts error", error);
    return new Response(JSON.stringify({ error: "Failed to load receipts" }), {
      status: 500,
    });
  }
});

// POST /api/delivery-receipts { messageId, status }
export const POST = withFirebaseAuth(async (authUser, request: NextRequest) => {
  try {
    const userId = authUser.id;
    const body = await request.json().catch(() => ({}));
    const { messageId, status } = body as {
      messageId?: string;
      status?: "delivered" | "read" | "failed";
    };
    if (!messageId || !status) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    // Lookup message to denormalize conversationId
    const msgDoc = await db.collection("messages").doc(messageId).get();
    const messageData = msgDoc.exists ? (msgDoc.data() as any) : null;
    const conversationId = messageData?.conversationId || null;

    const receiptId = `${messageId}_${userId}`;
    const updatedAt = Date.now();
    await db
      .collection("messageReceipts")
      .doc(receiptId)
      .set(
        {
          messageId,
          userId,
          status,
          updatedAt,
          ...(conversationId ? { conversationId } : {}),
        },
        { merge: true }
      );

    return new Response(
      JSON.stringify({ success: true, data: { messageId, status, updatedAt } }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("POST /api/delivery-receipts error", error);
    return new Response(JSON.stringify({ error: "Failed to record receipt" }), {
      status: 500,
    });
  }
});

// Duplicate alternative implementation removed to avoid redeclarations
