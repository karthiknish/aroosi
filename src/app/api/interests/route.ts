import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

type InterestAction = "send" | "remove";

interface InterestRequest {
  fromUserId: string;
  toUserId: string;
}

async function handleInterestAction(req: NextRequest, action: InterestAction) {
  try {
    // Validate token
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token } = authCheck;

    // Parse request body
    let body: Partial<InterestRequest>;
    try {
      body = await req.json();
    } catch (e) {
      return errorResponse("Invalid request body", 400, {
        details: e instanceof Error ? e.message : "Unknown error",
      });
    }

    // Validate required fields
    const { fromUserId, toUserId } = body;
    if (
      !fromUserId ||
      !toUserId ||
      typeof fromUserId !== "string" ||
      typeof toUserId !== "string"
    ) {
      return errorResponse("Invalid or missing user IDs", 400);
    }

    // Initialize Convex client
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return errorResponse("Server configuration error", 500);
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    convex.setAuth(token);

    try {
      const result = await convex.mutation(
        action === "send"
          ? api.interests.sendInterest
          : api.interests.removeInterest,
        {
          fromUserId: fromUserId as Id<"users">,
          toUserId: toUserId as Id<"users">,
        }
      );

      return successResponse(result);
    } catch (convexErr) {
      const error = convexErr as Error;
      const isAuthError =
        error.message.includes("Unauthenticated") ||
        error.message.includes("token") ||
        error.message.includes("authentication");

      return errorResponse(
        isAuthError ? "Authentication failed" : `Failed to ${action} interest`,
        isAuthError ? 401 : 400,
        process.env.NODE_ENV === "development"
          ? { details: error.message }
          : undefined
      );
    }
  } catch (error) {
    return errorResponse(
      "Internal server error",
      500,
      process.env.NODE_ENV === "development"
        ? { details: error instanceof Error ? error.message : String(error) }
        : undefined
    );
  }
}

export async function GET(req: NextRequest) {
  // Get userId from query string
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return errorResponse("Missing userId parameter", 400);
  }

  // Auth
  const authCheck = requireUserToken(req);
  if ("errorResponse" in authCheck) return authCheck.errorResponse;
  const { token } = authCheck;

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return errorResponse("Server configuration error", 500);
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);

  try {
    // Query interests sent by this user
    const result = await convex.query(api.interests.getSentInterests, {
      userId: userId as Id<"users">,
    });
    return successResponse(result);
  } catch (error) {
    return errorResponse(
      "Failed to fetch sent interests",
      500,
      process.env.NODE_ENV === "development"
        ? { details: error instanceof Error ? error.message : String(error) }
        : undefined
    );
  }
}

export async function POST(req: NextRequest) {
  return handleInterestAction(req, "send");
}

export async function DELETE(req: NextRequest) {
  return handleInterestAction(req, "remove");
}
