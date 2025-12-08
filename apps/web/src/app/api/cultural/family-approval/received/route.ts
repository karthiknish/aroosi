import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  FamilyApprovalRequest,
  FamilyApprovalResponse
} from "@/types/cultural";

// GET /api/cultural/family-approval/received - Get requests received by user
export const GET = withFirebaseAuth(async (user, request) => {
  // Rate limiting
  const rateLimitResult = checkApiRateLimit(`family_approval_received_${user.id}`, 100, 60000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const userId = user.id;

  try {
    const requestsSnapshot = await db
      .collection("familyApprovalRequests")
      .where("familyMemberId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const requests: FamilyApprovalRequest[] = [];
    requestsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      requests.push({ _id: doc.id, ...doc.data() } as FamilyApprovalRequest);
    });

    return NextResponse.json({
      success: true,
      requests
    } as FamilyApprovalResponse);
  } catch (error) {
    console.error("Error fetching received family approval requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch received requests" },
      { status: 500 }
    );
  }
});
