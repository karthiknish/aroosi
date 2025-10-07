import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  FamilyApprovalRequest,
  FamilyApprovalResponse
} from "@/types/cultural";

// POST /api/cultural/family-approval/request - Create a new family approval request
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
    const { familyMemberId, relationship, message } = body;

    // Validate required fields
    if (!familyMemberId || !relationship || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: familyMemberId, relationship, message"
        },
        { status: 400 }
      );
    }

    // Check if user already has a pending request to this family member
    const existingRequest = await db
      .collection("familyApprovalRequests")
      .where("requesterId", "==", userId)
      .where("familyMemberId", "==", familyMemberId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingRequest.empty) {
      return NextResponse.json(
        { success: false, error: "You already have a pending request to this family member" },
        { status: 409 }
      );
    }

    const now = Date.now();
    const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    const requestData: Omit<FamilyApprovalRequest, "_id"> = {
      requesterId: userId,
      familyMemberId,
      relationship,
      message,
      status: "pending",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("familyApprovalRequests").add(requestData);
    const newRequest = { _id: docRef.id, ...requestData };

    return NextResponse.json({
      success: true,
      request: newRequest
    } as FamilyApprovalResponse, { status: 201 });
  } catch (error) {
    console.error("Error creating family approval request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create request" },
      { status: 500 }
    );
  }
});
