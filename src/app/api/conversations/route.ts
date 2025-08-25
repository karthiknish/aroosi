import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

// GET: Fetch conversations for a user
export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    // Single auth call
    let userId: string;
    try {
      const auth = await requireAuth(request);
      userId = auth.userId;
    } catch (e) {
      const err = e as AuthError;
      const status = typeof err?.status === "number" ? err.status : 401;
      console.warn("Conversations auth failed", {
        scope: "conversations.list",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Unauthorized", correlationId },
        { status }
      );
    }

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(
      `get_conversations_${userId}`,
      60,
      60000
    );
    if (!rateLimitResult.allowed) {
      console.warn("Conversations rate limited", {
        scope: "conversations.list",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Rate limit exceeded", correlationId },
        { status: 429 }
      );
    }

    // Database operations via fetchQuery with server identity
    // Do not forward bearer tokens; server identity is used in Convex

    if (!userId) {
      console.warn("Conversations missing userId", {
        scope: "conversations.list",
        type: "missing_user",
        correlationId,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "User ID not found", correlationId },
        { status: 401 }
      );
    }

    // Firestore: fetch matches where user is participant and status is matched
    const [snap1, snap2] = await Promise.all([
      db
        .collection("matches")
        .where("user1Id", "==", userId)
        .where("status", "==", "matched")
        .get(),
      db
        .collection("matches")
        .where("user2Id", "==", userId)
        .where("status", "==", "matched")
        .get(),
    ]);
    const matches = [...snap1.docs, ...snap2.docs].map((d) => d.data() as any);

    // Unread counts: messages addressed to userId with no readAt
    const unreadSnap = await db
      .collection("messages")
      .where("toUserId", "==", userId)
      .get();
    const unreadCounts: Record<string, number> = {};
    unreadSnap.docs.forEach(
      (
        doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
      ) => {
        const m = doc.data() as Record<string, any>;
        if (!m.readAt) {
          const otherId = m.fromUserId as string;
          unreadCounts[otherId] = (unreadCounts[otherId] || 0) + 1;
        }
      }
    );

    // Transform matches into conversation format
    const conversations = await Promise.all(
      matches.map(
        async (
          m: any
        ): Promise<{
          _id: string;
          id: string;
          conversationId: string;
          participants: any[];
          lastMessage: any;
          lastActivity: number;
          lastMessageAt?: number | null;
          unreadCount: number;
          createdAt: number;
          updatedAt: number;
        }> => {
          const otherUserId = m.user1Id === userId ? m.user2Id : m.user1Id;
          const conversationId = [String(userId), String(otherUserId)]
            .sort()
            .join("_");

          // Fetch other user's profile fields
          const otherUserDoc = await db
            .collection("users")
            .doc(otherUserId)
            .get();
          const otherProfile = otherUserDoc.exists
            ? (otherUserDoc.data() as any)
            : {};

          // Last message: prefer denormalized match.lastMessage, fallback to query
          let lastMessage: any = null;
          const lmSource = (m as any).lastMessage;
          if (lmSource && lmSource.createdAt) {
            lastMessage = {
              _id: lmSource.id || lmSource._id || "",
              id: lmSource.id || lmSource._id || "",
              fromUserId: lmSource.fromUserId,
              toUserId: lmSource.toUserId,
              content: lmSource.text,
              text: lmSource.text,
              type: lmSource.type || "text",
              timestamp: lmSource.createdAt,
              createdAt: lmSource.createdAt,
              readAt: lmSource.readAt,
              isRead: !!lmSource.readAt,
            };
          } else {
            try {
              const lastMsgSnap = await db
                .collection("messages")
                .where("conversationId", "==", conversationId)
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();
              if (!lastMsgSnap.empty) {
                const lm = lastMsgSnap.docs[0].data() as any;
                lastMessage = {
                  _id: lastMsgSnap.docs[0].id,
                  id: lastMsgSnap.docs[0].id,
                  fromUserId: lm.fromUserId,
                  toUserId: lm.toUserId,
                  content: lm.text,
                  text: lm.text,
                  type: lm.type || "text",
                  timestamp: lm.createdAt,
                  createdAt: lm.createdAt,
                  readAt: lm.readAt,
                  isRead: !!lm.readAt,
                };
              }
            } catch {
              /* ignore */
            }
          }

          const createdAt = m.createdAt || Date.now();
          const lastActivity =
            lastMessage?.createdAt || createdAt || Date.now();
          return {
            _id: conversationId,
            id: conversationId,
            conversationId,
            participants: [
              { userId: String(userId), fullName: "You" },
              {
                userId: String(otherUserId),
                fullName: otherProfile.fullName || "Unknown",
                profileImageUrls: otherProfile.profileImageUrls || [],
              },
            ],
            lastMessage,
            lastActivity,
            lastMessageAt: lastMessage?.createdAt || null,
            unreadCount: unreadCounts[String(otherUserId)] || 0,
            createdAt,
            updatedAt: lastActivity,
          };
        }
      )
    );

    // Sort by last activity (most recent first)
    conversations.sort((a: any, b: any) => b.lastActivity - a.lastActivity);

    const response = NextResponse.json({
      conversations,
      total: conversations.length,
      correlationId,
    });

    console.info("Conversations list success", {
      scope: "conversations.list",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      total: conversations.length,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Conversations list unhandled error", {
      scope: "conversations.list",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch conversations",
        details: message,
        correlationId,
      },
      { status: 500 }
    );
  }
}
