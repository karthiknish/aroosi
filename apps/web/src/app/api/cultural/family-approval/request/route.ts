import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { db } from "@/lib/firebaseAdmin";
import type {
  FamilyApprovalRequest,
  FamilyRelationship,
} from "@aroosi/shared/types";
import { familyApprovalRequestCreateSchema } from "@/lib/validation/apiSchemas/culturalFamilyApproval";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof familyApprovalRequestCreateSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { familyMemberId, relationship, message } = body;

    try {
      // Check for existing pending request
      const existingRequest = await db
        .collection("familyApprovalRequests")
        .where("requesterId", "==", userId)
        .where("familyMemberId", "==", familyMemberId)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (!existingRequest.empty) {
        return errorResponse("You already have a pending request to this family member", 409, { correlationId: ctx.correlationId });
      }

      const now = nowTimestamp();
      const expiresAt = now + (30 * 24 * 60 * 60 * 1000);

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

      return successResponse({ request: newRequest }, 201, ctx.correlationId);
    } catch (error) {
      console.error("cultural/family-approval/request error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to create request", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: familyApprovalRequestCreateSchema,
    rateLimit: { identifier: "family_approval_request", maxRequests: 50 }
  }
);
