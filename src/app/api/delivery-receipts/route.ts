import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    let client = getConvexClient();
    if (!client) client = getConvexClient();
    if (!client) return errorResponse("Service temporarily unavailable", 503);
    client.setAuth(token);

    const { messageId, status } = await request.json();
    if (!messageId || !status)
      return errorResponse("Missing messageId or status", 400);

    const validStatuses = ["delivered", "read", "failed"];
    if (!validStatuses.includes(status)) {
      return errorResponse("Invalid status", 400);
    }

    // Store delivery receipt in Convex
    const receiptId = await client.mutation(api.deliveryReceipts.recordDeliveryReceipt, {
      messageId: messageId as Id<"messages">,
      userId: userId as Id<"users">,
      status,
    });

    return successResponse({
      message: "Delivery receipt recorded",
      receiptId,
      messageId,
      status,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error recording delivery receipt:", error);
    return errorResponse("Failed to record delivery receipt", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token } = authCheck;

    let client = getConvexClient();
    if (!client) client = getConvexClient();
    if (!client) return errorResponse("Service temporarily unavailable", 503);
    client.setAuth(token);

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) return errorResponse("Missing conversationId", 400);

    // Fetch delivery receipts from Convex
    const deliveryReceipts = await client.query(api.deliveryReceipts.getDeliveryReceipts, {
      conversationId: conversationId as Id<"messages">,
    });

    return successResponse({
      conversationId,
      deliveryReceipts,
    });
  } catch (error) {
    console.error("Error fetching delivery receipts:", error);
    return errorResponse("Failed to fetch delivery receipts", 500);
  }
}
