import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext,
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { db } from "@/lib/firebaseAdmin";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { correlationId } = ctx;

    try {
      // 1. Fetch matches where user is participant and status is matched
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

      // 2. Unread counts: messages addressed to userId with no readAt
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

      // 3. Transform matches into conversation format
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

            const createdAt = m.createdAt || nowTimestamp();
            const lastActivity =
              lastMessage?.createdAt || createdAt || nowTimestamp();
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

      return successResponse({
        conversations,
        total: conversations.length,
      }, 200, correlationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Conversations list error", {
        message,
        correlationId,
      });
      return errorResponse("Failed to fetch conversations", 500, {
        correlationId,
        details: { message },
      });
    }
  },
  {
    rateLimit: { identifier: "get_conversations", maxRequests: 60 }
  }
);
