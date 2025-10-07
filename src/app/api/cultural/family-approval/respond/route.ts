import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  FamilyApprovalRequest,
  FamilyApprovalResponse,
  FamilyApprovalStatus
} from "@/types/cultural";

// POST /api/cultural/family-approval/respond - Respond to a family approval request
export const POST = withFirebaseAuth(async (req: NextRequest) => {
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
    const { requestId, action, responseMessage } = body;

    // Validate required fields
    if (!requestId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: requestId, action"
        },
        { status: 400 }
      );
    }

    // Validate action
    const validActions: FamilyApprovalStatus[] = ["approved", "denied"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'approved' or 'denied'" },
        { status: 400 }
      );
    }

    // Get the request
    const requestDoc = await db.collection("familyApprovalRequests").doc(requestId).get();
    if (!requestDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    const request = { _id: requestDoc.id, ...requestDoc.data() } as FamilyApprovalRequest;

    // Check if user is the family member who can respond
    if (request.familyMemberId !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only respond to requests addressed to you" },
        { status: 403 }
      );
    }

    // Check if request is still pending
    if (request.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "This request has already been responded to" },
        { status: 409 }
      );
    }

    // Check if request hasn't expired
    if (request.expiresAt < Date.now()) {
      // Auto-expire the request
      await db.collection("familyApprovalRequests").doc(requestId).update({
        status: "expired",
        updatedAt: Date.now()
      });

      return NextResponse.json(
        { success: false, error: "This request has expired" },
        { status: 410 }
      );
    }

    // Update the request
    const now = Date.now();
    const updateData: Partial<FamilyApprovalRequest> = {
      status: action,
      responseMessage: responseMessage || "",
      responseTimestamp: now,
      updatedAt: now
    };

    await db.collection("familyApprovalRequests").doc(requestId).update(updateData);

    // Get updated request
    const updatedDoc = await db.collection("familyApprovalRequests").doc(requestId).get();
    const updatedRequest = { _id: updatedDoc.id, ...updatedDoc.data() } as FamilyApprovalRequest;

    return NextResponse.json({
      success: true,
      request: updatedRequest
    } as FamilyApprovalResponse);
  } catch (error) {
    console.error("Error responding to family approval request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to respond to request" },
      { status: 500 }
    );
  }
});
