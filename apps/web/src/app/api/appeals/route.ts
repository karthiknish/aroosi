import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { appealCreateSchema } from "@/lib/validation/apiSchemas/appeals";

// Use createAuthenticatedHandler with allowBanned: true
export const POST = createAuthenticatedHandler(
  async (
    ctx: AuthenticatedApiContext,
    body: import("zod").infer<typeof appealCreateSchema>
  ) => {
    const userId = ctx.user.id;
    const { reason, details } = body;

    try {
      const now = nowTimestamp();
      const appealsCol = COLLECTIONS.APPEALS || "appeals";
      const appealRef = db.collection(appealsCol).doc();
      
      await appealRef.set({
        id: appealRef.id,
        userId,
        reason,
        details,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      return successResponse({ id: appealRef.id }, 200, ctx.correlationId);
    } catch (error) {
      console.error("appeals POST error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to submit appeal", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    allowBanned: true,
    bodySchema: appealCreateSchema,
    rateLimit: { identifier: "appeals_submit", maxRequests: 5 }
  }
);
