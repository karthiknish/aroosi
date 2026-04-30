import {
  createAuthenticatedHandler,
  errorResponse,
  successResponse,
} from "@/lib/api/handler";
import type { AuthenticatedApiContext } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

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
  const familyMemberEmail =
    typeof body.familyMemberEmail === "string" ? body.familyMemberEmail.trim().toLowerCase() : "";

  if (!toUserId || !familyMemberEmail) {
    return errorResponse("toUserId and familyMemberEmail are required", 400, {
      correlationId: ctx.correlationId,
    });
  }

  try {
    const familyMemberSnap = await db
      .collection("users")
      .where("email", "==", familyMemberEmail)
      .limit(1)
      .get();

    if (familyMemberSnap.empty) {
      return errorResponse("Family member not found", 404, { correlationId: ctx.correlationId });
    }

    const familyMemberId = familyMemberSnap.docs[0].id;
    const existingRequest = await db
      .collection("familyApprovalRequests")
      .where("requesterId", "==", userId)
      .where("targetUserId", "==", toUserId)
      .where("familyMemberId", "==", familyMemberId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingRequest.empty) {
      return errorResponse("You already have a pending request for this user", 409, {
        correlationId: ctx.correlationId,
      });
    }

    const now = nowTimestamp();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    const requestData = {
      requesterId: userId,
      targetUserId: toUserId,
      familyMemberId,
      relationship: "other",
      message: "",
      status: "pending",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("familyApprovalRequests").add(requestData);
    return successResponse({ request: { _id: docRef.id, ...requestData } }, 201, ctx.correlationId);
  } catch (error) {
    console.error("cultural/family-approval POST compatibility error", {
      error,
      correlationId: ctx.correlationId,
    });
    return errorResponse("Failed to create request", 500, {
      correlationId: ctx.correlationId,
    });
  }
});