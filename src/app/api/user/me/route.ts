import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";

/**
 * Structured logger to keep logs consistent and searchable.
 */
function log(scope: string, level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) {
  const payload = {
    scope,
    level,
    message,
    ts: new Date().toISOString(),
    ...((extra && Object.keys(extra).length > 0) ? { extra } : {}),
  };
  // eslint-disable-next-line no-console
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

/**
 * Cookie-only session context. No Authorization header or explicit token passthrough.
 */
function getSessionContext(): { source: "cookie"; cookieTried: string[] } {
  const cookieNames = [
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
    "__Secure-session-token",
    "session-token",
    "auth-token",
    "jwt",
  ];
  const tried: string[] = [];
  try {
    const jar: any = (cookies as any)();
    if (jar && typeof jar.get === "function" && typeof jar.then !== "function") {
      for (const name of cookieNames) {
        tried.push(name);
        // We do not return the value; only record the probe for diagnostics.
        void jar.get(name);
      }
    } else {
      log("api/user/me", "warn", "cookies() not usable or Promise-like in this runtime", {});
    }
  } catch (e) {
    log("api/user/me", "warn", "cookies() threw during cookie probe", { error: (e as Error)?.message });
  }
  return { source: "cookie", cookieTried: tried };
}

/**
 * Normalize unknown errors for consistent API responses and logs.
 */
function toErrorDetails(err: unknown): { message: string; code?: string } {
  if (typeof err === "object" && err !== null) {
    const code = (err as any)?.code as string | undefined;
    const message =
      (err as any)?.message ??
      (err as any)?.error ??
      "Unexpected server error";
    return { message: String(message), ...(code ? { code } : {}) };
  }
  return { message: String(err) };
}

export async function GET(_request: NextRequest) {
  const scope = "api/user/me#GET";
  const convex = getConvexClient();
  if (!convex) {
    log(scope, "error", "Convex client not configured");
    return errorResponse("Convex client not configured", 500);
  }

  const { source, cookieTried } = getSessionContext();
  log(scope, "info", "Session context probed", {
    source,
    tried: cookieTried,
  });

  try {
    // Cookie-only: do not call convex.setAuth with tokens
    const userWithProfile = await convex.query(api.users.getCurrentUserWithProfile, {}).catch((convexError: unknown) => {
      const details = toErrorDetails(convexError);
      log(scope, "error", "Convex query failed", details);
      return null;
    });

    if (!userWithProfile || !userWithProfile.profile) {
      log(scope, "warn", "Profile missing in response");
      return errorResponse("User profile not found", 404);
    }

    return successResponse({ profile: userWithProfile.profile });
  } catch (error) {
    const details = toErrorDetails(error);
    log(scope, "error", "Unhandled GET error", details);
    return errorResponse("Failed to fetch user profile", 500, { details });
  }
}

export async function PUT(request: NextRequest) {
  const scope = "api/user/me#PUT";
  const convex = getConvexClient();
  if (!convex) {
    log(scope, "error", "Convex client not configured");
    return errorResponse("Convex client not configured", 500);
  }

  const { source, cookieTried } = getSessionContext();
  log(scope, "info", "Session context probed", {
    source,
    tried: cookieTried,
  });
  
  // Cookie-only gate: ensure a cookie exists by probing typical names; reject if none found
  if (!cookieTried || cookieTried.length === 0) {
    log(scope, "warn", "No session cookies observed; rejecting");
    return errorResponse("Unauthorized - session cookie not found", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (jsonError) {
    log(scope, "warn", "Invalid JSON body", { error: (jsonError as Error)?.message });
    return errorResponse("Invalid JSON body", 400);
  }

  try {
    // Cookie-only: do not call convex.setAuth with tokens
    const updatedUser = await convex.mutation(api.users.updateProfile, body as any);

    if (!updatedUser) {
      log(scope, "warn", "Update returned empty result");
      return errorResponse("User profile not found or not updated", 404);
    }

    log(scope, "info", "Update success");
    return successResponse(updatedUser);
  } catch (convexError) {
    const details = toErrorDetails(convexError);
    if (details.code === "NoAuthProvider") {
      log(scope, "warn", "Convex NoAuthProvider for session");
      return errorResponse("Unauthorized - invalid session for Convex", 401, { details });
    }
    log(scope, "error", "Convex mutation error", details);
    return errorResponse("Failed to update user profile in Convex", 500, { details });
  }
}
