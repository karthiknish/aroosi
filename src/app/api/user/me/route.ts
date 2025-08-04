import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";

/**
 * Read auth token from secure cookies only. No Authorization header.
 */
function getTokenFromCookies(): string | null {
  try {
    const jar = cookies();
    // Prefer HttpOnly session cookie names used by the app
    // Try common names; adjust if your auth sets a different key
    const names = [
      "session-token",
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "auth-token",
      "jwt",
    ];
    for (const name of names) {
      const c = jar.get(name);
      if (c?.value) return c.value;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(_request: NextRequest) {
  try {
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);

    const token = getTokenFromCookies();

    let userWithProfile;
    try {
      // Use cookie-based auth if present
      convex.setAuth(token || "");
      userWithProfile = await convex.query(api.users.getCurrentUserWithProfile, {});
    } catch (convexError: unknown) {
      // Fallback for NoAuthProvider – return public data if available
      if (
        typeof convexError === "object" &&
        convexError !== null &&
        "code" in convexError &&
        (convexError as { code?: string }).code === "NoAuthProvider"
      ) {
        console.warn("[API /api/user/me] NoAuthProvider – retrying without auth");
        convex.setAuth("");
        userWithProfile = await convex.query(api.users.getCurrentUserWithProfile, {});
      } else {
        throw convexError;
      }
    }

    if (!userWithProfile || !userWithProfile.profile) {
      return errorResponse("User profile not found", 404);
    }

    return successResponse({ profile: userWithProfile.profile });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return errorResponse("Failed to fetch user profile", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);

    const token = getTokenFromCookies();
    if (!token) {
      return errorResponse("Unauthorized - session not found", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("[API /api/user/me] PUT Invalid JSON body:", jsonError);
      return errorResponse("Invalid JSON body", 400);
    }

    try {
      convex.setAuth(token);
      const updatedUser = await convex.mutation(api.users.updateProfile, body as any);

      if (!updatedUser) {
        return errorResponse("User profile not found or not updated", 404);
      }

      return successResponse(updatedUser);
    } catch (convexError) {
      console.error("[API /api/user/me] PUT Convex mutation error:", convexError);
      return errorResponse("Failed to update user profile in Convex", 500, {
        details:
          convexError instanceof Error ? convexError.message : String(convexError),
      });
    }
  } catch (error) {
    console.error("[API /api/user/me] PUT Unexpected error:", error);
    return errorResponse("An unexpected error occurred", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
