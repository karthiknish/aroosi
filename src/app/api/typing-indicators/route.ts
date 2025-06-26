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

    const { conversationId, action } = await request.json();
    if (!conversationId || !action || !["start", "stop"].includes(action)) {
      return errorResponse("Invalid request parameters", 400);
    }

    // Update typing indicator in Convex
    const indicatorId = await client.mutation(api.typingIndicators.updateTypingStatus, {
      conversationId,
      userId: userId as Id<"users">,
      isTyping: action === "start",
    });

    return successResponse({
      message: `Typing indicator ${action}ed`,
      indicatorId,
      conversationId,
      userId,
      action,
      isTyping: action === "start",
    });
  } catch (error) {
    console.error("Error handling typing indicator:", error);
    return errorResponse("Failed to update typing indicator", 500);
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

    // Fetch typing indicators from Convex
    const typingUsers = await client.query(api.typingIndicators.getTypingUsers, {
      conversationId,
    });

    return successResponse({
      conversationId,
      typingUsers,
    });
  } catch (error) {
    console.error("Error fetching typing indicators:", error);
    return errorResponse("Failed to fetch typing indicators", 500);
  }
}
