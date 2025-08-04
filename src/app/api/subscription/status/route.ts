import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

/**
 * Normalize subscription status response and avoid wrappers that might cause 404/rewrites.
 * Accepts optional query params: profileId, userId
 * Resolves current user profile server-side when neither is provided.
 */
export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const json = (data: unknown, status = 200) =>
    new NextResponse(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");
    const userIdParam = searchParams.get("userId");

    // Convex client (cookie-auth flow; do not rely on bearer headers)
    const { getConvexClient } = await import("@/lib/convexClient");
    const client = getConvexClient();
    if (!client) {
      console.error("Subscription status convex not configured", {
        scope: "subscription.status",
        type: "convex_not_configured",
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return json(
        { success: false, error: "Convex backend not configured", correlationId },
        500
      );
    }

    let profile: unknown = null;

    if (profileId) {
      profile = await client
        .query(api.users.getProfile, {
          id: profileId as Id<"profiles">,
        })
        .catch((e: unknown) => {
          console.error("Subscription status getProfile error", {
            scope: "subscription.status",
            type: "convex_query_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return null;
        });
    } else if (userIdParam) {
      profile = await client
        .query(api.profiles.getProfileByUserId, {
          userId: userIdParam as Id<"users">,
        })
        .catch((e: unknown) => {
          console.error("Subscription status getProfileByUserId error", {
            scope: "subscription.status",
            type: "convex_query_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return null;
        });
    } else {
      // Resolve from current server-side context using cookie-based verification
      // Attempt to read auth-token cookie and, if expired, transparently refresh
      const cookieToken = request.cookies.get("auth-token")?.value || null;
      let accessToken: string | null = cookieToken;
      let userIdFromSession: string | null = null;

      if (!accessToken) {
        // Try refresh if refresh-token exists (proxy to our refresh route)
        const refreshCookie = request.cookies.get("refresh-token")?.value;
        if (refreshCookie) {
          const refreshUrl = new URL("/api/auth/refresh", request.url);
          const refreshResp = await fetch(refreshUrl.toString(), {
            method: "POST",
            headers: { cookie: request.headers.get("cookie") || "" },
          });
          if (refreshResp.ok) {
            const setCookieHeader = refreshResp.headers.get("set-cookie") || "";
            const cookies = setCookieHeader ? setCookieHeader.split(/,(?=[^;]+=[^;]+)/) : [];
            for (const c of cookies) {
              const m = c.match(/auth-token=([^;]+)/);
              if (m) {
                accessToken = decodeURIComponent(m[1]);
                break;
              }
            }
          }
        }
      }

      if (!accessToken) {
        console.warn("Subscription status no access token via cookies", {
          scope: "subscription.status",
          type: "no_session",
          correlationId,
          statusCode: 401,
          durationMs: Date.now() - startedAt,
        });
        return json({ success: false, error: "No auth session", correlationId }, 401);
      }

      try {
        const { verifyAccessJWT } = await import("@/lib/auth/jwt");
        const payload = await verifyAccessJWT(accessToken);
        userIdFromSession = payload.userId;
      } catch (e) {
        console.warn("Subscription status access token invalid; attempting refresh", {
          scope: "subscription.status",
          type: "access_invalid",
          correlationId,
          statusCode: 401,
          durationMs: Date.now() - startedAt,
        });
        const refreshCookie = request.cookies.get("refresh-token")?.value;
        if (refreshCookie) {
          const refreshUrl = new URL("/api/auth/refresh", request.url);
          const refreshResp = await fetch(refreshUrl.toString(), {
            method: "POST",
            headers: { cookie: request.headers.get("cookie") || "" },
          });
          if (refreshResp.ok) {
            const setCookieHeader = refreshResp.headers.get("set-cookie") || "";
            const cookies = setCookieHeader ? setCookieHeader.split(/,(?=[^;]+=[^;]+)/) : [];
            let newAccess: string | null = null;
            for (const c of cookies) {
              const m = c.match(/auth-token=([^;]+)/);
              if (m) {
                newAccess = decodeURIComponent(m[1]);
                break;
              }
            }
            if (newAccess) {
              const { verifyAccessJWT } = await import("@/lib/auth/jwt");
              const payload = await verifyAccessJWT(newAccess);
              userIdFromSession = payload.userId;
            }
          }
        }
      }

      if (!userIdFromSession) {
        return json({ success: false, error: "Invalid or expired session", correlationId }, 401);
      }

      // Lookup profile by resolved userId
      profile = await client
        .query(api.profiles.getProfileByUserId, {
          userId: userIdFromSession as unknown as Id<"users">,
        })
        .catch((e: unknown) => {
          console.error("Subscription status getProfileByUserId (session) error", {
            scope: "subscription.status",
            type: "convex_query_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return null;
        });
    }

    if (!profile) {
      console.warn("Subscription status profile not found", {
        scope: "subscription.status",
        type: "profile_not_found",
        correlationId,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return json({ success: false, error: "User profile not found", correlationId }, 404);
    }

    // Narrow profile fields safely
    const p = profile as {
      subscriptionExpiresAt?: number | null;
      subscriptionPlan?: string | null;
      boostsRemaining?: number | null;
      hasSpotlightBadge?: boolean | null;
      spotlightBadgeExpiresAt?: number | null;
    };

    const now = Date.now();
    const expiresAt =
      typeof p.subscriptionExpiresAt === "number"
        ? p.subscriptionExpiresAt
        : null;
    const isActive = expiresAt ? expiresAt > now : false;
    const plan = (p.subscriptionPlan ?? "free") || "free";
    let daysRemaining = 0;
    if (expiresAt && isActive) {
      daysRemaining = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    }

    const response = json(
      {
        success: true,
        plan,
        isActive,
        expiresAt,
        daysRemaining,
        boostsRemaining:
          typeof p.boostsRemaining === "number" ? p.boostsRemaining : 0,
        hasSpotlightBadge: !!p.hasSpotlightBadge,
        spotlightBadgeExpiresAt:
          typeof p.spotlightBadgeExpiresAt === "number"
            ? p.spotlightBadgeExpiresAt
            : null,
        correlationId,
      },
      200
    );

    console.info("Subscription status success", {
      scope: "subscription.status",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Subscription status unhandled error", {
      scope: "subscription.status",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return json(
      {
        success: false,
        error: "Failed to fetch subscription status",
        details: message,
        correlationId,
      },
      500
    );
  }
}
