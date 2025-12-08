import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { requireSession, devLog } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";
import { Notifications } from "@/lib/notify";

interface ReportDoc {
  reporterUserId: string;
  reportedUserId: string;
  reason: string;
  description?: string;
  status: "pending";
  createdAt: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    // Rate limiting for safety reports
    const rateLimitResult = checkApiRateLimit(
      `safety_report_${userId}`,
      10,
      60000
    ); // 10 reports per minute
    if (!rateLimitResult.allowed) {
      return errorResponse(
        "Rate limit exceeded. Please wait before reporting again.",
        429
      );
    }

    const body = await request.json();
    const { reportedUserId, reason, description } = body;

    if (!reportedUserId || !reason) {
      return errorResponse(
        "Missing required fields: reportedUserId and reason",
        400
      );
    }

    // Validate reason
    const validReasons = [
      "inappropriate_content",
      "harassment",
      "fake_profile",
      "spam",
      "safety_concern",
      "inappropriate_behavior",
      "other",
    ];

    if (!validReasons.includes(reason)) {
      return errorResponse("Invalid report reason", 400);
    }

    // If reason is 'other', description is required
    if (
      reason === "other" &&
      (!description || description.trim().length === 0)
    ) {
      return errorResponse(
        "Description is required for 'other' report type",
        400
      );
    }

    // Short per-target cooldown: 60s per reporter-target pair
    const key = `${userId}_${reportedUserId}`;
    const now = Date.now();
    (globalThis as any).__reportCooldownMap =
      (globalThis as any).__reportCooldownMap || new Map<string, number>();
    const map: Map<string, number> = (globalThis as any).__reportCooldownMap;
    const last = map.get(key) || 0;
    if (now - last < 60_000) {
      return errorResponse("Please wait before reporting this user again", 429);
    }

    // Persist report in Firestore
    let reportId: string | null = null;
    try {
      const ref = db.collection("reports").doc();
      const doc: ReportDoc = {
        reporterUserId: userId,
        reportedUserId,
        reason,
        description: description?.trim() || undefined,
        status: "pending",
        createdAt: Date.now(),
      };
      await ref.set(doc);
      reportId = ref.id;
      // Notify admins for moderation (email)
      try {
        await Notifications.contactAdmin(
          "Safety Report",
          "noreply@aroosi.app",
          `New report ${reportId}\nReporter: ${userId}\nReported: ${reportedUserId}\nReason: ${reason}\nDescription: ${description || "-"}`
        );
      } catch {}
    } catch (e) {
      devLog("error", "safety.report", "firestore_error", {
        message: e instanceof Error ? e.message : String(e),
      });
      return errorResponse("Failed to submit report", 500);
    }

    map.set(key, now);

    return successResponse({
      message: "User reported successfully. Our team will review this report.",
      reportId,
    });
  } catch (error) {
    devLog("error", "safety.report", "unhandled_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Failed to submit report", 500);
  }
}
