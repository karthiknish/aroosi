import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";

/**
 * Extracts and validates the JWT token from the request headers
 */
function getTokenFromRequest(req: NextRequest): { token: string | null; error?: string } {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return { token: null, error: "No authorization header" };
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer") {
      return { token: null, error: "Invalid token type" };
    }

    if (!token) {
      return { token: null, error: "No token provided" };
    }

    return { token };
  } catch (error) {
    return {
      token: null,
      error: error instanceof Error ? error.message : "Failed to process token",
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    // Extract and validate token
    const { token, error: tokenError } = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: tokenError || "Invalid or missing token",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Initialize Convex client
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);

    try {
      // Set the auth token
      convex.setAuth(token);

      // Get the user ID from the URL
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return NextResponse.json(
          {
            error: "User ID is required",
            details: "The user ID is missing from the URL",
            path: url.pathname,
          },
          { status: 400 }
        );
      }

      const viewedUserId = id as Id<"users">;

      try {
        const result = await convex.action(api.users.getProfileDetailPageData, {
          viewedUserId,
        });

        // Only return text/profile data, not images
        const {
          currentUser,
          profileData,
          isBlocked = false,
          isMutualInterest = false,
          sentInterest = [],
          error,
        } = result;

        const responseData = {
          success: true,
          currentUser: currentUser || null,
          profileData: profileData || null,
          isBlocked: Boolean(isBlocked),
          isMutualInterest: Boolean(isMutualInterest),
          sentInterest: Array.isArray(sentInterest) ? sentInterest : [],
          ...(error ? { error } : {}),
          timestamp: new Date().toISOString(),
        };

        return NextResponse.json(responseData, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        });
      } catch (actionError) {
        // Check if this is a known error from Convex
        const errorMessage =
          actionError instanceof Error ? actionError.message : "Unknown error";
        const isAuthError =
          errorMessage.includes("Unauthenticated") ||
          errorMessage.includes("token") ||
          errorMessage.includes("authentication");

        return NextResponse.json(
          {
            error: isAuthError
              ? "Authentication failed"
              : "Failed to fetch profile data",
            details:
              process.env.NODE_ENV === "development" ? errorMessage : undefined,
            code: isAuthError ? "AUTH_ERROR" : "API_ERROR",
            timestamp: new Date().toISOString(),
          },
          {
            status: isAuthError ? 401 : 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (convexError) {
      return NextResponse.json(
        {
          error: "Failed to process request",
          details:
            process.env.NODE_ENV === "development"
              ? convexError instanceof Error
                ? convexError.message
                : String(convexError)
              : undefined,
          code: "CLIENT_ERROR",
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Please check the server logs",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
