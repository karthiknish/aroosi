import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

    const url = new URL(request.url);
    const conversationId = url.pathname.split("/").slice(-2, -1)[0];
    if (!conversationId) return errorResponse("Missing conversationId", 400);

    const result = await convex.mutation(api.messages.markConversationRead, {
      conversationId,
      userId: userId as Id<"users">,
    });
    return successResponse(result);
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return errorResponse("Failed to mark conversation as read", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
