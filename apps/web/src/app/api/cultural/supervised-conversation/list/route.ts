import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  SupervisedConversation,
  SupervisedConversationResponse
} from "@/types/cultural";

// GET /api/cultural/supervised-conversation/list - Get user's supervised conversations
export const GET = withFirebaseAuth(async (user, request) => {
  // Rate limiting
  const rateLimitResult = checkApiRateLimit(`supervised_conv_list_${user.id}`, 100, 60000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const userId = user.id;

  try {
    const conversationsSnapshot = await db
      .collection("supervisedConversations")
      .where("requesterId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const conversations: SupervisedConversation[] = [];
    conversationsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
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
