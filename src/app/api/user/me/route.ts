import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";

/**
 * Robust cookie/session token extraction that is compatible with
 * environments where cookies() and headers() may be typed as Promise-like.
 * We synchronously unwrap by detecting a then function and throwing if awaited.
 */
function getSessionToken(): string | null {
  const cookieNames = [
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
    "__Secure-session-token",
    "session-token",
    "auth-token",
    "jwt",
  ];

  // Helper to safely get cookies jar
  function getCookiesJar(): any | null {
    try {
      const jar: any = (cookies as any)();
      // Guard against Promise-like typing
      if (jar && typeof jar.then === "function") {
        // In Next.js stable, cookies() is sync in route handlers. If it's Promise-like here,
        // we cannot safely await in a sync helper; skip cookie read and rely on header fallback.
        return null;
      }
      return typeof jar?.get === "function" ? jar : null;
    } catch {
      return null;
    }
  }

  // Helper to safely get headers reader
  function getHeadersReader(): ((key: string) => string | null) | null {
    try {
      const h: any = (headers as any)();
      if (h && typeof h.then === "function") {
        return null;
      }
      if (typeof h?.get === "function") {
        return (key: string) => {
          const v = h.get(key);
          return typeof v === "string" ? v : v?.toString?.() ?? null;
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // Try cookies first
  const jar = getCookiesJar();
  if (jar) {
    for (const name of cookieNames) {
      try {
        const c = jar.get(name);
        if (c?.value && typeof c.value === "string" && c.value.trim()) {
          return c.value;
        }
      } catch {
        // continue
      }
    }
  }

  // Fallback to headers (only for specific non-Authorization keys)
  const readHeader = getHeadersReader();
  if (readHeader) {
    const hVal =
      readHeader("X-Session-Token") ||
      readHeader("x-session-token") ||
      readHeader("X-Auth-Token") ||
      readHeader("x-auth-token");
    if (typeof hVal === "string" && hVal.trim()) return hVal;
  }

  return null;
}

/**
 * Build a normalized error payload from unknown errors
 */
function toErrorDetails(err: unknown): { message: string; code?: string } {
  if (typeof err === "object" && err !== null) {
    const code = (err as any)?.code as string | undefined;
    const message =
      (err as any)?.message ||
      (err as any)?.error ||
      "Unexpected server error";
    return { message: String(message), ...(code ? { code } : {}) };
  }
  return { message: String(err) };
}

export async function GET(_request: NextRequest) {
  try {
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);

    const token = getSessionToken();

    let userWithProfile: any;
    try {
      // Use cookie-based auth if present, else anonymous
      convex.setAuth(token || "");
      userWithProfile = await convex.query(api.users.getCurrentUserWithProfile, {});
    } catch (convexError: unknown) {
      const details = toErrorDetails(convexError);
      // Fallback for NoAuthProvider – return public data if available
      if (details.code === "NoAuthProvider") {
        console.warn("[API /api/user/me] NoAuthProvider – retrying without auth");
        convex.setAuth("");
        userWithProfile = await convex.query(api.users.getCurrentUserWithProfile, {});
      } else {
        // For robustness, still attempt anonymous fetch if token path failed
        try {
          convex.setAuth("");
          userWithProfile = await convex.query(api.users.getCurrentUserWithProfile, {});
        } catch {
          return errorResponse("Failed to fetch user profile", 500, { details });
        }
      }
    }

    if (!userWithProfile || !userWithProfile.profile) {
      return errorResponse("User profile not found", 404);
    }

    return successResponse({ profile: userWithProfile.profile });
  } catch (error) {
    const details = toErrorDetails(error);
    console.error("Error fetching user profile:", details);
    return errorResponse("Failed to fetch user profile", 500, { details });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);

    const token = getSessionToken();
    if (!token) {
      // Be explicit about cookie/session requirement
      return errorResponse("Unauthorized - session cookie not found", 401);
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
      const details = toErrorDetails(convexError);
      console.error("[API /api/user/me] PUT Convex mutation error:", details);
      // Handle NoAuthProvider explicitly
      if (details.code === "NoAuthProvider") {
        return errorResponse("Unauthorized - invalid session for Convex", 401, { details });
      }
      return errorResponse("Failed to update user profile in Convex", 500, { details });
    }
  } catch (error) {
    const details = toErrorDetails(error);
    console.error("[API /api/user/me] PUT Unexpected error:", details);
    return errorResponse("An unexpected error occurred", 500, { details });
  }
}
