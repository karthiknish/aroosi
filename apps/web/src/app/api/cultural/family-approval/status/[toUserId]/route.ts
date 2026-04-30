import {
  createAuthenticatedHandler,
  errorResponse,
  successResponse,
} from "@/lib/api/handler";
import type { AuthenticatedApiContext } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ toUserId: string }> }) {
  const handler = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
    const userId = ctx.user.id;
    const { toUserId } = await context.params;

    if (!toUserId) {
      return errorResponse("Missing target user", 400, { correlationId: ctx.correlationId });
    }

    try {
      const requestsSnapshot = await db
        .collection("familyApprovalRequests")
        .where("requesterId", "==", userId)
        .where("targetUserId", "==", toUserId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (requestsSnapshot.empty) {
        return successResponse({ status: null, request: null }, 200, ctx.correlationId);
      }

      const requestDoc = requestsSnapshot.docs[0];
      return successResponse(
        { status: requestDoc.data().status || null, request: { _id: requestDoc.id, ...requestDoc.data() } },
        200,
        ctx.correlationId
      );
    } catch (error) {
      console.error("cultural/family-approval/status GET error", {
        error,
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to fetch approval status", 500, {
        correlationId: ctx.correlationId,
      });
    }
  });

  return handler(request);
}