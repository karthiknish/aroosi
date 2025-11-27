import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  FamilyApprovalRequest,
  FamilyApprovalResponse
} from "@/types/cultural";

// GET /api/cultural/family-approval/requests - Get user's sent requests
export const GET = withFirebaseAuth(async (user, request) => {
  // Rate limiting
  const rateLimitResult = checkApiRateLimit(`family_approval_requests_${user.id}`, 100, 60000);
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
      .where("requesterId", "==", userId)
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
    console.error("Error fetching family approval requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
});
