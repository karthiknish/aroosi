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
  FamilyRelationship,
} from "@aroosi/shared/types";

const requestSchema = z.object({
  familyMemberId: z.string().min(1),
  relationship: z.enum(["father", "mother", "brother", "sister", "uncle", "aunt", "grandfather", "grandmother", "cousin", "guardian", "other"]),
  message: z.string().min(1),
});

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof requestSchema>) => {
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

      const now = Date.now();
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
    bodySchema: requestSchema,
    rateLimit: { identifier: "family_approval_request", maxRequests: 50 }
  }
);
