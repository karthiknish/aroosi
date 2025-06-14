import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";

type InterestAction = "send" | "remove";

interface InterestRequest {
  fromUserId: string;
  toUserId: string;
}

function getTokenFromRequest(req: NextRequest): {
  token: string | null;
  error?: string;
} {
  try {
    const auth = req.headers.get("authorization");

    if (!auth) {
      console.log("[API] No authorization header found");
      return { token: null, error: "No authorization header" };
    }

    const [type, token] = auth.split(" ");

    if (type !== "Bearer") {
      console.log("[API] Invalid token type. Expected Bearer token");
      return { token: null, error: "Invalid token type" };
    }

    if (!token) {
      console.log("[API] No token provided after Bearer");
      return { token: null, error: "No token provided" };
    }

    return { token };
  } catch (error) {
    console.error("[API] Error extracting token:", error);
    return {
      token: null,
      error: error instanceof Error ? error.message : "Failed to process token",
    };
  }
}

async function handleInterestAction(req: NextRequest, action: InterestAction) {
  try {
    // Validate token
    const { token, error: tokenError } = getTokenFromRequest(req);
    if (!token) {
      return errorResponse(
        "Authentication failed",
        401,
        tokenError ? { details: tokenError } : undefined
      );
    }

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
  const { token, error: tokenError } = getTokenFromRequest(req);
  if (!token) {
    return errorResponse(
      "Authentication failed",
      401,
      tokenError ? { details: tokenError } : undefined
    );
  }

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
