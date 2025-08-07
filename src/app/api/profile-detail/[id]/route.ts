import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { Id } from "@convex/_generated/dataModel";
// import { errorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    try {
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
        // Compose profile detail data from existing queries
        const basicProfile = await convexQueryWithAuth(
          req,
          api.users.getProfileByUserIdPublic,
          {
            userId: viewedUserId,
          } as any
        );
        // For now, return minimal shape expected by clients
        const result = {
          currentUser: null,
          profileData: basicProfile,
          isBlocked: false,
          isMutualInterest: false,
          sentInterest: [],
        } as const;

        // Only return text/profile data, not images
        const {
          currentUser,
          profileData,
          isBlocked = false,
          isMutualInterest = false,
          sentInterest = [],
        } = result;

        const responseData = {
          success: true,
          currentUser: currentUser || null,
          profileData: profileData || null,
          isBlocked: Boolean(isBlocked),
          isMutualInterest: Boolean(isMutualInterest),
          sentInterest: Array.isArray(sentInterest) ? sentInterest : [],
          // No additional error info in composed response
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
