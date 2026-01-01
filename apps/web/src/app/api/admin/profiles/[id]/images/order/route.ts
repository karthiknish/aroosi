import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  AuthenticatedApiContext
} from "@/lib/api/handler";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { NextRequest } from "next/server";

export const POST = createAuthenticatedHandler(
  async (ctx: AuthenticatedApiContext, body: any) => {
    try {
      // Role check: only admins allowed
      if (!ctx.user.isAdmin) {
        return errorResponse("Admin access required", 403, {
          correlationId: ctx.correlationId,
          code: "FORBIDDEN",
        });
      }

      const params = await ctx.nextCtx?.params;
      const id = params?.id;
      if (!id) {
        return errorResponse("User ID is required", 400, {
          correlationId: ctx.correlationId,
        });
      }

      const startedAt = ctx.startTime;
      const { imageIds } = body || {};

      if (!Array.isArray(imageIds)) {
        return errorResponse("imageIds must be an array", 400, {
          correlationId: ctx.correlationId,
        });
      }

      await db.collection("users").doc(id).set(
        {
          profileImageOrder: imageIds,
          updatedAt: nowTimestamp(),
        },
        { merge: true }
      );

      return successResponse(
        {
          ok: true,
          durationMs: nowTimestamp() - startedAt,
        },
        200,
        ctx.correlationId
      );
    } catch (e) {
      console.error("image order error", e);
      return errorResponse("Failed to update image order", 500, {
        correlationId: ctx.correlationId,
      });
    }
  }
);