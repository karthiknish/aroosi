import { NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/app/api/_utils/auth";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

// Deterministic reaction document ID to avoid composite indexes
function makeReactionId(messageId: string, userId: string, emoji: string) {
  // Encode emoji and separators safely for Firestore doc IDs
  const enc = encodeURIComponent(emoji);
  return `${messageId}__${userId}__${enc}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId") || "";
  if (!conversationId) {
    return json(400, { success: false, error: "conversationId is required" });
  }

  try {
    const snap = await db
      .collection("reactions")
      .where("conversationId", "==", conversationId)
      .get();
    const reactions = snap.docs.map((d: any) => {
      const r = d.data() as any;
      return {
        id: d.id,
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
        updatedAt: r.updatedAt || r.createdAt || Date.now(),
      };
    });
    return json(200, { success: true, reactions });
  } catch (e: any) {
    return json(500, {
      success: false,
      error: e?.message || "Failed to load reactions",
    });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if ("errorResponse" in auth) return auth.errorResponse;
  const { userId } = auth;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const messageId: string = (body?.messageId || "").trim();
  const emoji: string = (body?.emoji || "").trim();

  if (!messageId || !emoji) {
    return json(400, {
      success: false,
      error: "messageId and emoji are required",
    });
  }

  try {
    // Ensure message exists and get conversationId
    const msgRef = db.collection("messages").doc(messageId);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
      return json(404, { success: false, error: "Message not found" });
    }
    const msg = msgSnap.data() as any;
    const conversationId: string = msg.conversationId || "";
    if (!conversationId) {
      return json(400, {
        success: false,
        error: "Message missing conversationId",
      });
    }

    const now = Date.now();
    const id = makeReactionId(messageId, String(userId), emoji);
    const ref = db.collection("reactions").doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      // Toggle off -> delete
      await ref.delete();
      return json(200, { success: true, removed: true });
    }
    // Toggle on -> create
    await ref.set({
      messageId,
      conversationId,
      userId: String(userId),
      emoji,
      createdAt: now,
      updatedAt: now,
    });
    return json(200, { success: true, added: true });
  } catch (e: any) {
    return json(500, {
      success: false,
      error: e?.message || "Failed to toggle reaction",
    });
  }
}
