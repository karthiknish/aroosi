import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  errorResponsePublic,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { Notifications } from "@/lib/notify";

const validReasons = [
  "inappropriate_content",
  "harassment",
  "fake_profile",
  "spam",
  "safety_concern",
  "inappropriate_behavior",
  "other",
] as const;

const reportSchema = z.object({
  reportedUserId: z.string().min(1, "reportedUserId is required"),
  reason: z.enum(validReasons),
  description: z.string().optional(),
}).refine(
  (data) => data.reason !== "other" || (data.description && data.description.trim().length > 0),
  { message: "Description is required for 'other' report type", path: ["description"] }
);

// Per-target cooldown map
const reportCooldownMap = new Map<string, number>();

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof reportSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { reportedUserId, reason, description } = body;

    // Per-target cooldown: 60s per reporter-target pair
    const key = `${userId}_${reportedUserId}`;
    const now = Date.now();
    const last = reportCooldownMap.get(key) || 0;
    if (now - last < 60_000) {
      return errorResponsePublic("Please wait before reporting this user again", 429);
    }

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

      reportCooldownMap.set(key, now);

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
    rateLimit: { identifier: "safety_report", maxRequests: 10 }
  }
);
