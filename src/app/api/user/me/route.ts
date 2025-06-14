import {} from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { NextRequest } from "next/server";

async function getTokenFromRequest(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return null;
  }
  return token;
}

export async function GET(request: NextRequest) {
  console.log(
    "[API /api/user/me] Server CLERK_JWT_ISSUER_DOMAIN:",
    process.env.CLERK_JWT_ISSUER_DOMAIN
  );

  try {
    const token = await getTokenFromRequest(request);

    if (!token) {
      console.error("[API /api/user/me] No or invalid Authorization header");
      return errorResponse("Unauthorized - No token provided", 401);
    }

    // Log the first 10 and last 10 chars of the token to verify it's the same one
    console.log(
      `[API /api/user/me] Token received (first/last 10 chars): ${token.substring(0, 10)}...${token.substring(token.length - 10)}`
    );

    // Log the token length to help with debugging
    console.log(`[API /api/user/me] Token length: ${token.length} characters`);

    try {
      // Pass the token to Convex
      console.log("[API /api/user/me] Calling fetchQuery with token");
      const userData = await fetchQuery(
        api.users.getCurrentUserWithProfile,
        {},
        { token }
      );

      if (!userData) {
        console.error("[API /api/user/me] No user data returned from Convex");
        return errorResponse("User profile not found", 404);
      }

      console.log(
        "[API /api/user/me] Successfully fetched user data from Convex"
      );
      return successResponse(userData);
    } catch (convexError) {
      console.error("[API /api/user/me] Convex fetchQuery error:", convexError);
      return errorResponse("Failed to fetch user profile from Convex", 500, {
        details:
          convexError instanceof Error
            ? convexError.message
            : String(convexError),
      });
    }
  } catch (error) {
    console.error("[API /api/user/me] Unexpected error:", error);
    return errorResponse("An unexpected error occurred", 500, {
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
    const token = await getTokenFromRequest(request);

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
      const updatedUser = await fetchMutation(api.users.updateProfile, body, {
        token,
      });

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
