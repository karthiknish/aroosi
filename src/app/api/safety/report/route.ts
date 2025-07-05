import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

// Initialize Convex client
const convexClient = getConvexClient();

export async function POST(request: NextRequest) {
  try {
    // Enhanced authentication with user ID extraction
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

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

    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }

    if (!client) {
      return errorResponse("Database connection failed", 500);
    }

    // Set authentication token
    client.setAuth(token);

    // Create the report
    const result = await client.mutation(api.safety.reportUser, {
      reporterUserId: userId as Id<"users">,
      reportedUserId,
      reason,
      description: description?.trim() || undefined,
    });

    return successResponse({
      message: "User reported successfully. Our team will review this report.",
      reportId: result,
    });
  } catch (error) {
    console.error("Error in safety report API:", error);
    return errorResponse("Failed to submit report", 500);
  }
}
