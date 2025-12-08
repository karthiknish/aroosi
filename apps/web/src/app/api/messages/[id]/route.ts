import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { successResponse, errorResponse } from "@/lib/apiResponse";

// PATCH /api/messages/:id (edit text)
export const PATCH = withFirebaseAuth(
  async (authUser, request: NextRequest) => {
    const correlationId = Math.random().toString(36).slice(2, 10);
    const startedAt = Date.now();
    try {
      const userId = authUser.id;
      const url = new URL(request.url);
      const parts = url.pathname.split("/");
      const messageId = parts[parts.length - 1];
      if (!messageId) {
        return errorResponse("Missing message id", 400, { correlationId });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON body", 400, { correlationId });
      }
      const text = (body as any)?.text as string | undefined;
      if (!text || typeof text !== "string") {
        return errorResponse("Missing text", 400, { correlationId });
      }

      const msgRef = db.collection("messages").doc(messageId);
      const msgSnap = await msgRef.get();
      if (!msgSnap.exists) {
        return errorResponse("Message not found", 404, { correlationId });
      }
      const message = msgSnap.data() as any;

      // Authorization: only sender can edit their text messages
      if (message.fromUserId !== userId) {
        return errorResponse("Forbidden", 403, { correlationId });
      }
      if (message.type && message.type !== "text") {
        return errorResponse("Only text messages can be edited", 400, {
          correlationId,
        });
      }
      if (message.deleted) {
        return errorResponse("Cannot edit a deleted message", 400, {
          correlationId,
        });
      }

      const now = Date.now();
      await msgRef.set(
        { text: text, edited: true, editedAt: now },
        { merge: true }
      );

      // If editing lastMessage, reflect change in conversations and matches
      const conversationId = String(message.conversationId || "");
      if (conversationId) {
        try {
          const convRef = db.collection("conversations").doc(conversationId);
          const convSnap = await convRef.get();
          if (convSnap.exists) {
            const conv = convSnap.data() as any;
            const lastId = conv?.lastMessage?.id || conv?.lastMessage?._id;
            if (lastId === messageId) {
              await convRef.set(
                {
                  lastMessage: {
                    ...(conv.lastMessage || {}),
                    id: messageId,
                    text,
                  },
                  updatedAt: now,
                },
                { merge: true }
              );
            }
          }
        } catch {}

        try {
          const a = [String(message.fromUserId), String(message.toUserId)].sort();
          const a1 = a[0];
          const a2 = a[1];
          const m1 = await db
            .collection("matches")
            .where("user1Id", "==", a1)
            .where("user2Id", "==", a2)
            .where("status", "==", "matched")
            .limit(1)
            .get();
          const matchDoc = !m1.empty ? m1.docs[0] : null;
          if (matchDoc) {
            const ml = (matchDoc.data() as any).lastMessage;
            if (ml?.id === messageId || ml?._id === messageId) {
              await db.collection("matches").doc(matchDoc.id).set(
                {
                  lastMessage: { ...(ml || {}), id: messageId, text },
                  updatedAt: now,
                },
                { merge: true }
              );
            }
          }
        } catch {}
      }

      return successResponse({ success: true }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResponse(message || "Failed to edit message", 500, {
        correlationId,
        durationMs: Date.now() - startedAt,
      });
    }
  }
);

// DELETE /api/messages/:id
export const DELETE = withFirebaseAuth(async (authUser, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const userId = authUser.id;
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const messageId = parts[parts.length - 1];
    if (!messageId) {
      return errorResponse("Missing message id", 400, { correlationId });
    }

    const msgRef = db.collection("messages").doc(messageId);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
      return errorResponse("Message not found", 404, { correlationId });
    }
    const message = msgSnap.data() as any;

    // Authorization: only sender or recipient can delete
    if (message.fromUserId !== userId && message.toUserId !== userId) {
      return errorResponse("Forbidden", 403, { correlationId });
    }

    // Soft delete: redact content and mark deleted
    const now = Date.now();
    await msgRef.set(
      {
        deleted: true,
        deletedAt: now,
        deletedBy: userId,
        // Redact sensitive content fields
        text: "",
      },
      { merge: true }
    );

    // If this message was the lastMessage on conversation, recompute
    const conversationId = String(message.conversationId || "");
    if (conversationId) {
      try {
        const convRef = db.collection("conversations").doc(conversationId);
        const convSnap = await convRef.get();
        if (convSnap.exists) {
          const conv = convSnap.data() as any;
          const lastId = conv?.lastMessage?.id || conv?.lastMessage?._id;
          if (lastId === messageId) {
            const latestSnap = await db
              .collection("messages")
              .where("conversationId", "==", conversationId)
              .where("deleted", "!=", true)
              .orderBy("deleted", "asc")
              .orderBy("createdAt", "desc")
              .limit(1)
              .get();
            if (!latestSnap.empty) {
              const d = latestSnap.docs[0];
              const m = d.data() as any;
              await convRef.set(
                {
                  lastMessage: {
                    id: d.id,
                    fromUserId: m.fromUserId,
                    toUserId: m.toUserId,
                    text: m.text || "",
                    type: m.type || "text",
                    createdAt: m.createdAt,
                  },
                  updatedAt: m.createdAt || now,
                },
                { merge: true }
              );
            } else {
              // No remaining messages; clear lastMessage
              await convRef.set(
                { lastMessage: null, updatedAt: now },
                { merge: true }
              );
            }
          }
        }
      } catch {
        // non-fatal
      }
    }

    // Update denormalized lastMessage on matches
    try {
      const a = [String(message.fromUserId), String(message.toUserId)].sort();
      const a1 = a[0];
      const a2 = a[1];
      const m1 = await db
        .collection("matches")
        .where("user1Id", "==", a1)
        .where("user2Id", "==", a2)
        .where("status", "==", "matched")
        .limit(1)
        .get();
      const matchDoc = !m1.empty ? m1.docs[0] : null;
      if (matchDoc) {
        // If match.lastMessage.id equals deleted id, recompute
        const ml = (matchDoc.data() as any).lastMessage;
        if (ml?.id === messageId || ml?._id === messageId) {
          const latestSnap = await db
            .collection("messages")
            .where("conversationId", "==", conversationId)
            .where("deleted", "!=", true)
            .orderBy("deleted", "asc")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
          if (!latestSnap.empty) {
            const d = latestSnap.docs[0];
            const m = d.data() as any;
            await db.collection("matches").doc(matchDoc.id).set(
              {
                lastMessage: {
                  id: d.id,
                  fromUserId: m.fromUserId,
                  toUserId: m.toUserId,
                  text: m.text || "",
                  type: m.type || "text",
                  createdAt: m.createdAt,
                },
                updatedAt: m.createdAt || now,
              },
              { merge: true }
            );
          } else {
            await db
              .collection("matches")
              .doc(matchDoc.id)
              .set({ lastMessage: null, updatedAt: now }, { merge: true });
          }
        }
      }
    } catch {
      // non-fatal
    }

    return successResponse({ success: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message || "Failed to delete message", 500, {
      correlationId,
      durationMs: Date.now() - startedAt,
    });
  }
});


