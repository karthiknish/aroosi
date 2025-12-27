import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import type {
  FamilyApprovalRequest,
  FamilyApprovalStatus,
} from "@aroosi/shared/types";

const respondSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["approved", "denied"]),
  responseMessage: z.string().optional(),
});

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof respondSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { requestId, action, responseMessage } = body;

    try {
      const requestDoc = await db.collection("familyApprovalRequests").doc(requestId).get();
      if (!requestDoc.exists) {
        return errorResponse("Request not found", 404, { correlationId: ctx.correlationId });
      }

      const approvalRequest = { _id: requestDoc.id, ...requestDoc.data() } as FamilyApprovalRequest;

      if (approvalRequest.familyMemberId !== userId) {
        return errorResponse("You can only respond to requests addressed to you", 403, { correlationId: ctx.correlationId });
      }

      if (approvalRequest.status !== "pending") {
        return errorResponse("This request has already been responded to", 409, { correlationId: ctx.correlationId });
      }

      if (approvalRequest.expiresAt < Date.now()) {
        await db.collection("familyApprovalRequests").doc(requestId).update({
          status: "expired",
          updatedAt: Date.now()
        });
        return errorResponse("This request has expired", 410, { correlationId: ctx.correlationId });
      }

      const now = Date.now();
      const updateData: Partial<FamilyApprovalRequest> = {
        status: action as FamilyApprovalStatus,
        responseMessage: responseMessage || "",
        responseTimestamp: now,
        updatedAt: now
      };

      await db.collection("familyApprovalRequests").doc(requestId).update(updateData);
      const updatedDoc = await db.collection("familyApprovalRequests").doc(requestId).get();
      const updatedRequest = { _id: updatedDoc.id, ...updatedDoc.data() } as FamilyApprovalRequest;

      return successResponse({ request: updatedRequest }, 200, ctx.correlationId);
    } catch (error) {
      console.error("cultural/family-approval/respond error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to respond to request", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: respondSchema,
    rateLimit: { identifier: "family_approval_respond", maxRequests: 50 }
  }
);
