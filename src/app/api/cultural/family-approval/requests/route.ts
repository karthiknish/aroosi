import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  FamilyApprovalRequest,
  FamilyApprovalResponse
} from "@/types/cultural";

// GET /api/cultural/family-approval/requests - Get user's sent requests
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
    const requestsSnapshot = await db
      .collection("familyApprovalRequests")
      .where("requesterId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const requests: FamilyApprovalRequest[] = [];
    requestsSnapshot.forEach((doc) => {
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
