import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  SupervisedConversation,
  SupervisedConversationResponse,
  SupervisedConversationStatus
} from "@/types/cultural";

// PUT /api/cultural/supervised-conversation/:id - Update a supervised conversation
export const PUT = withFirebaseAuth(async (req: NextRequest, context: any) => {
  const { params } = context;
  const conversationId = params.id;

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
    const body = await req.json();
    const { status, conversationId: chatConversationId } = body;

    // Get the conversation
    const conversationDoc = await db.collection("supervisedConversations").doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    const conversation = { _id: conversationDoc.id, ...conversationDoc.data() } as SupervisedConversation;

    // Check if user is involved in this conversation
    if (conversation.requesterId !== userId && conversation.supervisorId !== userId && conversation.targetUserId !== userId) {
      return NextResponse.json(
        { success: false, error: "You are not authorized to update this conversation" },
        { status: 403 }
      );
    }

    // Validate status if provided
    if (status) {
      const validStatuses: SupervisedConversationStatus[] = [
        "approved", "active", "paused", "ended", "rejected"
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: "Invalid status" },
          { status: 400 }
        );
      }

      // Status-specific validations
      if (status === "approved" && conversation.supervisorId !== userId) {
        return NextResponse.json(
          { success: false, error: "Only the supervisor can approve conversations" },
          { status: 403 }
        );
      }

      if (status === "active" && conversation.status !== "approved") {
        return NextResponse.json(
          { success: false, error: "Conversation must be approved before becoming active" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const now = Date.now();
    const updateData: Partial<SupervisedConversation> = {
      updatedAt: now
    };

    if (status) {
      updateData.status = status;

      if (status === "active" && !conversation.startedAt) {
        updateData.startedAt = now;
      }

      if (["ended", "rejected"].includes(status) && !conversation.endedAt) {
        updateData.endedAt = now;
      }
    }

    if (chatConversationId) {
      updateData.conversationId = chatConversationId;
    }

    // Update the conversation
    await db.collection("supervisedConversations").doc(conversationId).update(updateData);

    // Get updated conversation
    const updatedDoc = await db.collection("supervisedConversations").doc(conversationId).get();
    const updatedConversation = { _id: updatedDoc.id, ...updatedDoc.data() } as SupervisedConversation;

    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    } as SupervisedConversationResponse);
  } catch (error) {
    console.error("Error updating supervised conversation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update conversation" },
      { status: 500 }
    );
  }
});
