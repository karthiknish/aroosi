import { NextRequest } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

type ReactionDoc = {
  messageId: string;
  conversationId: string;
  userId: string;
  emoji: string;
  updatedAt: number;
};

// GET /api/reactions?conversationId=...
export const GET = withFirebaseAuth(async (_authUser, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) {
      return new Response(JSON.stringify({ error: "conversationId is required" }), { status: 400 });
    }

    const snap = await db
      .collection("messageReactions")
      .where("conversationId", "==", conversationId)
      .get();

    const reactions = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as ReactionDoc) }));
    return new Response(JSON.stringify({ reactions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GET /api/reactions error", error);
    return new Response(JSON.stringify({ error: "Failed to load reactions" }), { status: 500 });
  }
});

// POST /api/reactions { messageId, emoji }
export const POST = withFirebaseAuth(async (authUser, request: NextRequest) => {
  try {
    const userId = authUser.id;
    const body = await request.json().catch(() => ({}));
    const { messageId, emoji } = body as { messageId?: string; emoji?: string };
    if (!messageId || !emoji) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    // Lookup message to obtain conversationId
    const msgSnap = await db.collection("messages").doc(messageId).get();
    const msg = msgSnap.exists ? (msgSnap.data() as any) : null;
    const conversationId = msg?.conversationId;
    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Message not found" }), { status: 404 });
    }

    // Toggle reaction: if exists same emoji by same user on this message, remove; else upsert
    const reactionId = `${messageId}_${userId}_${emoji}`;
    const ref = db.collection("messageReactions").doc(reactionId);
    const existing = await ref.get();
    if (existing.exists) {
      await ref.delete();
      return new Response(JSON.stringify({ success: true, toggledOff: true }), { status: 200 });
    }

    const updatedAt = Date.now();
    await ref.set({ messageId, conversationId, userId, emoji, updatedAt } as ReactionDoc, { merge: true });
    return new Response(JSON.stringify({ success: true, toggledOn: true }), { status: 200 });
  } catch (error) {
    console.error("POST /api/reactions error", error);
    return new Response(JSON.stringify({ error: "Failed to toggle reaction" }), { status: 500 });
  }
});


