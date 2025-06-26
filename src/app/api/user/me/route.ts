import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken, getAuthToken } from "@/app/api/_utils/auth";

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);
    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (!profile) return errorResponse("User profile not found", 404);
    return successResponse({ profile });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return errorResponse("Failed to fetch user profile", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function PUT(request: NextRequest) {
  console.log(
    "[API /api/user/me] PUT Server CLERK_JWT_ISSUER_DOMAIN:",
    process.env.CLERK_JWT_ISSUER_DOMAIN
  );

  try {
    const { token } = getAuthToken(request);

    if (!token) {
      console.error(
        "[API /api/user/me] PUT No or invalid Authorization header"
      );
      return errorResponse("Unauthorized - No token provided", 401);
    }

    // Log the first 10 and last 10 chars of the token to verify it's the same one
    console.log(
      `[API /api/user/me] PUT Token received (first/last 10 chars): ${token.substring(0, 10)}...${token.substring(token.length - 10)}`
    );

    // Log the token length to help with debugging
    console.log(
      `[API /api/user/me] PUT Token length: ${token.length} characters`
    );

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("[API /api/user/me] PUT Invalid JSON body:", jsonError);
      return errorResponse("Invalid JSON body", 400);
    }

    try {
      // Pass the token and body to Convex mutation
      console.log(
        "[API /api/user/me] Calling fetchMutation with token and body"
      );
      // CHANGED: use updateProfile instead of updateCurrentUserProfile
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      convex.setAuth(token);
      const updatedUser = await convex.mutation(api.users.updateProfile, body);

      if (!updatedUser) {
        console.error(
          "[API /api/user/me] PUT No user data returned from Convex after update"
        );
        return errorResponse("User profile not found or not updated", 404);
      }

      console.log(
        "[API /api/user/me] PUT Successfully updated user data in Convex"
      );
      return successResponse(updatedUser);
    } catch (convexError) {
      console.error(
        "[API /api/user/me] PUT Convex fetchMutation error:",
        convexError
      );
      return errorResponse("Failed to update user profile in Convex", 500, {
        details:
          convexError instanceof Error
            ? convexError.message
            : String(convexError),
      });
    }
  } catch (error) {
    console.error("[API /api/user/me] PUT Unexpected error:", error);
    return errorResponse("An unexpected error occurred", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
