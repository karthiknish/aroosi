import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  SupervisedConversation,
  SupervisedConversationResponse
} from "@/types/cultural";

// GET /api/cultural/supervised-conversation/list - Get user's supervised conversations
export const GET = withFirebaseAuth(async (req: NextRequest) => {
  // Rate limiting
  const rateLimitResult = await checkApiRateLimit(req);
  if (rateLimitResult) return rateLimitResult;

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "User not authenticated" },
      { status: 401 }
    );
  }

  try {
    const conversationsSnapshot = await db
      .collection("supervisedConversations")
      .where("requesterId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const conversations: SupervisedConversation[] = [];
    conversationsSnapshot.forEach((doc) => {
      conversations.push({ _id: doc.id, ...doc.data() } as SupervisedConversation);
    });

    return NextResponse.json({
      success: true,
      conversations
    } as SupervisedConversationResponse);
  } catch (error) {
    console.error("Error fetching supervised conversations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
});
