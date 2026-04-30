import {
  createAuthenticatedHandler,
  errorResponse,
  successResponse,
} from "@/lib/api/handler";
import type { AuthenticatedApiContext } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import type { SupervisedConversation } from "@aroosi/shared/types";

export const POST = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  const userId = ctx.user.id;

  let body: Record<string, unknown> = {};
  try {
    const parsed = await ctx.request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore invalid JSON and fall through to validation.
  }

  const toUserId = typeof body.toUserId === "string" ? body.toUserId.trim() : "";
  const supervisorEmail =
    typeof body.supervisorEmail === "string" ? body.supervisorEmail.trim().toLowerCase() : "";

  if (!toUserId || !supervisorEmail) {
    return errorResponse("toUserId and supervisorEmail are required", 400, {
      correlationId: ctx.correlationId,
    });
  }

  try {
    const supervisorSnap = await db
      .collection("users")
      .where("email", "==", supervisorEmail)
      .limit(1)
      .get();

    if (supervisorSnap.empty) {
      return errorResponse("Supervisor not found", 404, { correlationId: ctx.correlationId });
    }

    const supervisorId = supervisorSnap.docs[0].id;
    const approvalSnapshot = await db
      .collection("familyApprovalRequests")
      .where("requesterId", "==", userId)
      .where("familyMemberId", "==", supervisorId)
      .where("status", "==", "approved")
      .limit(1)
      .get();

    if (approvalSnapshot.empty) {
      return errorResponse("Supervisor must approve family approval first", 403, {
        correlationId: ctx.correlationId,
      });
    }

    const existingConversation = await db
      .collection("supervisedConversations")
      .where("requesterId", "==", userId)
      .where("targetUserId", "==", toUserId)
      .where("supervisorId", "==", supervisorId)
      .where("status", "in", ["initiated", "approved", "active"])
      .limit(1)
      .get();

    if (!existingConversation.empty) {
      return errorResponse("A supervised conversation already exists for this pair", 409, {
        correlationId: ctx.correlationId,
      });
    }

    const now = nowTimestamp();
    const conversationData: Omit<SupervisedConversation, "_id"> = {
      requesterId: userId,
      targetUserId: toUserId,
      supervisorId,
      status: "initiated",
      guidelines: [],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("supervisedConversations").add(conversationData);
    return successResponse({ conversation: { _id: docRef.id, ...conversationData } }, 201, ctx.correlationId);
  } catch (error) {
    console.error("cultural/supervised-conversation POST compatibility error", {
      error,
      correlationId: ctx.correlationId,
    });
    return errorResponse("Failed to initiate conversation", 500, {
      correlationId: ctx.correlationId,
    });
  }
});