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
 * Robust cookie/session token extraction with clear diagnostics.
 * No Authorization: Bearer is supported anywhere.
 */
function getSessionToken(): { token: string | null; source: "cookie" | "header" | "none"; cookieTried: string[] } {
  const cookieNames = [
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
    "__Secure-session-token",
    "session-token",
    "auth-token",
    "jwt",
  ];
  const tried: string[] = [];

  // Try cookies first
  try {
    const jar: any = (cookies as any)();
    if (jar && typeof jar.get === "function" && typeof jar.then !== "function") {
      for (const name of cookieNames) {
        tried.push(name);
        const c = jar.get(name);
        if (c?.value && typeof c.value === "string" && c.value.trim()) {
          return { token: c.value, source: "cookie", cookieTried: tried };
        }
      }
    } else {
      log("api/user/me", "warn", "cookies() not usable or Promise-like in this runtime", {});
    }
  } catch (e) {
    log("api/user/me", "warn", "cookies() threw during token extraction", { error: (e as Error)?.message });
  }

  // Optional header fallback for special non-browser callers
  try {
    const h: any = (headers as any)();
    const hasGet = h && typeof h.get === "function" && typeof h.then !== "function";
    if (hasGet) {
      const headersToTry = ["X-Session-Token", "x-session-token", "X-Auth-Token", "x-auth-token"];
      for (const hdr of headersToTry) {
        const val = h.get(hdr);
        if (typeof val === "string" && val.trim()) {
          return { token: val, source: "header", cookieTried: tried };
        }
      }
    }
  } catch (e) {
    log("api/user/me", "warn", "headers() threw during token extraction", { error: (e as Error)?.message });
  }

  return { token: null, source: "none", cookieTried: tried };
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

  const { token, source, cookieTried } = getSessionToken();
  log(scope, "info", "Session token resolved", {
    source,
    tried: cookieTried,
    hasToken: Boolean(token),
  });

  try {
    let userWithProfile: any | null = null;

    try {
      convex.setAuth(token || "");
      userWithProfile = await convex.query(api.users.getCurrentUserWithProfile, {});
      log(scope, "info", "Convex query success", { mode: token ? "session" : "anonymous" });
    } catch (convexError: unknown) {
      const details = toErrorDetails(convexError);
      log(scope, "warn", "Convex query failed with token; retrying anonymous", details);
      try {
        convex.setAuth("");
        userWithProfile = await convex.query(api.users.getCurrentUserWithProfile, {});
        log(scope, "info", "Convex anonymous retry success");
      } catch (anonErr: unknown) {
        const d2 = toErrorDetails(anonErr);
        log(scope, "error", "Convex anonymous retry failed", d2);
        return errorResponse("Failed to fetch user profile", 500, { details: d2 });
      }
    }

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

  const { token, source, cookieTried } = getSessionToken();
  log(scope, "info", "Session token resolved", {
    source,
    tried: cookieTried,
    hasToken: Boolean(token),
  });

  if (!token) {
    log(scope, "warn", "No session token; rejecting");
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
    convex.setAuth(token);
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
