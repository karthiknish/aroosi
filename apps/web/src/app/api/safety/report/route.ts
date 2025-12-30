import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  errorResponsePublic,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { Notifications } from "@/lib/notify";
import { reportSchema } from "@/lib/validation/apiSchemas/safety";

// Use createAuthenticatedHandler with per-target rate limiting
export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof reportSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { reportedUserId, reason, description } = body;

    try {
      const ref = db.collection("reports").doc();
      await ref.set({
        reporterUserId: userId,
        reportedUserId,
        reason,
        description: description?.trim() || undefined,
        status: "pending",
        createdAt: Date.now(),
      });

      // Notify admins for moderation
      try {
        await Notifications.contactAdmin(
          "Safety Report",
          "noreply@aroosi.app",
          `New report ${ref.id}\nReporter: ${userId}\nReported: ${reportedUserId}\nReason: ${reason}\nDescription: ${description || "-"}`
        );
      } catch {}

      return successResponse({
        message: "User reported successfully. Our team will review this report.",
        reportId: ref.id,
      }, 200, ctx.correlationId);
    } catch (e) {
      console.error("safety/report error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to submit report", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: reportSchema,
    rateLimit: [
      { 
        identifier: "safety_report", 
        maxRequests: 10 
      },
      {
        identifier: "safety_report_target",
        maxRequests: 1,
        windowMs: 60000,
        getIdentifier: (ctx, body) => `report_target_${(ctx.user as any).id}_${body.reportedUserId}`,
        message: "Please wait before reporting this user again"
      }
    ]
  }
);
