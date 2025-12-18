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
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withFirebaseAuth(async (user, request, ctx: { params: Promise<{ id: string }> }) => {
    const { id: conversationId } = await ctx.params;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`supervised_conv_put_${user.id}`, 50, 60000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const userId = user.id;

    try {
      const body = await request.json();
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
  })(req, context);
}
