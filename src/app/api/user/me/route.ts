import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  convexQueryWithAuth,
  convexMutationWithAuth,
} from "@/lib/convexServer";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Structured logger to keep logs consistent and searchable.
 */
function log(
  scope: string,
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>
) {
  const payload = {
    scope,
    level,
    message,
    ts: new Date().toISOString(),
    ...(extra && Object.keys(extra).length > 0 ? { extra } : {}),
  };
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(payload);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(payload);
  } else {
    // eslint-disable-next-line no-console
    console.log(payload);
  }
}

/**
 * Cookie-only session context. No Authorization header or explicit token passthrough.
 */
async function getSessionContext(): Promise<{
  source: "cookie";
  cookieTried: string[];
}> {
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
    const jar: any = await (cookies() as unknown as Promise<any>);
    if (jar && typeof jar.getAll === "function") {
      const all = jar.getAll();
      // Record only names we care about for diagnostics
      for (const name of cookieNames) {
        tried.push(name);
        // best-effort probe; ignore value
        void all.find((c: any) => c?.name === name);
      }
    } else {
      log("api/user/me", "warn", "cookies() store unavailable", {});
    }
  } catch (e) {
    log("api/user/me", "warn", "cookies() threw during cookie probe", {
      error: (e as Error)?.message,
    });
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
      (err as any)?.message ?? (err as any)?.error ?? "Unexpected server error";
    return { message: String(message), ...(code ? { code } : {}) };
  }
  return { message: String(err) };
}

export async function GET(_request: NextRequest) {
  const scope = "api/user/me#GET";
  // Cookie/session-based auth via Convex server helpers

  const { source, cookieTried } = await getSessionContext();
  log(scope, "info", "Session context probed", {
    source,
    tried: cookieTried,
  });

  try {
    // Initial attempt (cookie-based session)
    let userWithProfile = await convexQueryWithAuth(
      _request,
      api.users.getCurrentUserWithProfile,
      {}
    ).catch((convexError: unknown) => {
      const details = toErrorDetails(convexError);
      log(scope, "error", "Convex query failed", details);
      return null;
    });

    // If missing, try to hydrate from Clerk and ensure Convex user exists
    if (!userWithProfile || !userWithProfile.profile) {
      const clerk = await currentUser();
      if (!clerk) {
        log(scope, "warn", "No Clerk user; unauthenticated");
        return errorResponse("Unauthenticated", 401);
      }
      const email = clerk.emailAddresses?.[0]?.emailAddress?.toLowerCase();
      if (!email) {
        log(scope, "warn", "Clerk user missing primary email");
        return errorResponse("User email not available", 400);
      }
      // See if a Convex user already exists via direct query by email (does not require profile)
      let convexUser: any = null;
      try {
        convexUser = await convexQueryWithAuth(
          _request,
          (api as any).users.getUserByEmail,
          { email }
        );
      } catch (e) {
        log(scope, "warn", "getUserByEmail failed", toErrorDetails(e));
      }
      if (!convexUser) {
        // Skip auto-creation: profile data is incomplete from this context.
        log(
          scope,
          "warn",
          "Convex user missing; skipping creation due to incomplete profile context",
          {
            email,
            clerkId: clerk.id,
            note: "Create only via signup with full profile payload",
          }
        );
      }
      // Re-query after possible creation
      try {
        userWithProfile = await convexQueryWithAuth(
          _request,
          api.users.getCurrentUserWithProfile,
          {}
        );
      } catch (e) {
        log(
          scope,
          "warn",
          "Re-query after missing-user handling failed",
          toErrorDetails(e)
        );
      }
    }

    if (!userWithProfile) {
      // Return empty (200) rather than 404 to avoid frontend hard failures; profile may be created later.
      log(scope, "info", "Returning empty user/profile placeholder");
      return successResponse({ profile: null });
    }
    return successResponse({ profile: userWithProfile.profile || null });
  } catch (error) {
    const details = toErrorDetails(error);
    log(scope, "error", "Unhandled GET error", details);
    return errorResponse("Failed to fetch user profile", 500, { details });
  }
}

export async function PUT(request: NextRequest) {
  const scope = "api/user/me#PUT";
  // Cookie/session-based auth via Convex server helpers

  const { source, cookieTried } = await getSessionContext();
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
    log(scope, "warn", "Invalid JSON body", {
      error: (jsonError as Error)?.message,
    });
    return errorResponse("Invalid JSON body", 400);
  }

  try {
    const updatedUser = await convexMutationWithAuth(
      request,
      api.users.updateProfile,
      { updates: body as any } as any
    );

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
      return errorResponse("Unauthorized - invalid session for Convex", 401, {
        details,
      });
    }
    log(scope, "error", "Convex mutation error", details);
    return errorResponse("Failed to update user profile in Convex", 500, {
      details,
    });
  }
}
