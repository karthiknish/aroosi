import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  SupervisedConversation,
  SupervisedConversationResponse
} from "@/types/cultural";

// POST /api/cultural/supervised-conversation/initiate - Initiate a supervised conversation
export const POST = withFirebaseAuth(async (user, request) => {
  // Rate limiting
  const rateLimitResult = checkApiRateLimit(`supervised_conv_init_${user.id}`, 30, 60000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const userId = user.id;

  try {
    const body = await request.json();
    const { targetUserId, supervisorId, guidelines } = body;

    // Validate required fields
    if (!targetUserId || !supervisorId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: targetUserId, supervisorId"
        },
        { status: 400 }
      );
    }

    // Check if supervisor has approved family approval for this user
    const approvalSnapshot = await db
      .collection("familyApprovalRequests")
      .where("requesterId", "==", userId)
      .where("familyMemberId", "==", supervisorId)
      .where("status", "==", "approved")
      .limit(1)
      .get();

    if (approvalSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Supervisor must approve family approval first" },
        { status: 403 }
      );
    }

    // Check if there's already an active supervised conversation
    const existingConversation = await db
      .collection("supervisedConversations")
      .where("requesterId", "==", userId)
      .where("targetUserId", "==", targetUserId)
      .where("supervisorId", "==", supervisorId)
      .where("status", "in", ["initiated", "approved", "active"])
      .limit(1)
      .get();

    if (!existingConversation.empty) {
      return NextResponse.json(
        { success: false, error: "A supervised conversation already exists for this pair" },
        { status: 409 }
      );
    }

    const now = Date.now();
    const conversationData: Omit<SupervisedConversation, "_id"> = {
      requesterId: userId,
      targetUserId,
      supervisorId,
      status: "initiated",
      guidelines: guidelines || [],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("supervisedConversations").add(conversationData);
    const newConversation = { _id: docRef.id, ...conversationData };

    return NextResponse.json({
      success: true,
      conversation: newConversation
    } as SupervisedConversationResponse, { status: 201 });
  } catch (error) {
    console.error("Error initiating supervised conversation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate conversation" },
      { status: 500 }
    );
  }
});
