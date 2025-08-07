import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchMutation } from "convex/nextjs";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);

    // Rate limiting for safety reports
    const rateLimitResult = checkApiRateLimit(
      `safety_report_${userId}`,
      10,
      60000,
    ); // 10 reports per minute
    if (!rateLimitResult.allowed) {
      return errorResponse(
        "Rate limit exceeded. Please wait before reporting again.",
        429,
      );
    }

    const body = await request.json();
    const { reportedUserId, reason, description } = body;

    if (!reportedUserId || !reason) {
      return errorResponse(
        "Missing required fields: reportedUserId and reason",
        400,
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
        400,
      );
    }

    const result = await fetchMutation(api.safety.reportUser, {
      reporterUserId: userId as Id<"users">,
      reportedUserId,
      reason,
      description: description?.trim() || undefined,
    } as any);

    return successResponse({
      message: "User reported successfully. Our team will review this report.",
      reportId: result,
    });
  } catch (error) {
    console.error("Error in safety report API:", error);
    return errorResponse("Failed to submit report", 500);
  }
}
