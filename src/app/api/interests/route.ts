import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { requireUserToken } from "@/app/api/_utils/auth";
import { logSecurityEvent } from "@/lib/utils/securityHeaders";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";

type InterestAction = "send" | "remove";

interface InterestRequest {
  fromUserId: string;
  toUserId: string;
}

async function handleInterestAction(req: NextRequest, action: InterestAction) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const authCheck = await requireUserToken(req);
    if ("errorResponse" in authCheck) {
      const res = authCheck.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      console.warn("Interests action auth failed", {
        scope: "interests.action",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }
    const { userId } = authCheck;
    // Cookie-only model: token is not provided; keep variable for legacy optional calls
    const token: string | undefined = undefined;

    if (!userId) {
      console.warn("Interests action missing userId", {
        scope: "interests.action",
        type: "auth_context_missing",
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: "User ID is required", correlationId }, { status: 400 });
    }

    const subscriptionRateLimit =
      await subscriptionRateLimiter.checkSubscriptionRateLimit(
        req,
        undefined as unknown as string, // cookie-only: no token; keep signature compatibility
        userId,
        "interest_sent"
      );

    if (!subscriptionRateLimit.allowed) {
      console.warn("Interests action rate limited", {
        scope: "interests.action",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: subscriptionRateLimit.error || "Subscription limit exceeded", correlationId },
        { status: 429 }
      );
    }

    let body: Partial<InterestRequest>;
    try {
      body = await req.json();
    } catch {
      console.warn("Interests action invalid body", {
        scope: "interests.action",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: "Invalid request body", correlationId }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Missing or invalid body", correlationId }, { status: 400 });
    }

    const { toUserId } = body as { toUserId?: string };
    if (!toUserId || typeof toUserId !== "string") {
      return NextResponse.json({ error: "Invalid or missing toUserId", correlationId }, { status: 400 });
    }

    let convexClient: ReturnType<typeof getConvexClient>;
    let fromUserIdConvex: Id<"users">;

    {
      const convex = getConvexClient();
      if (!convex) {
        console.error("Interests action convex not configured", {
          scope: "interests.action",
          type: "convex_not_configured",
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(
          { error: "Convex client not configured", correlationId },
          { status: 500 }
        );
      }
      try {
        // @ts-ignore optional legacy
        convex.setAuth?.(token);
      } catch {}

      let currentUserRecord;
      try {
        currentUserRecord = await convex.query(
          api.users.getCurrentUserWithProfile,
          {}
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isAuth =
          message.includes("Unauthenticated") || message.includes("token");
        return NextResponse.json(
          {
            error: isAuth ? "Authentication failed" : "Failed to fetch current user",
            correlationId,
          },
          { status: isAuth ? 401 : 400 }
        );
      }

      if (!currentUserRecord) {
        return NextResponse.json({ error: "User not found", correlationId }, { status: 404 });
      }

      fromUserIdConvex = currentUserRecord._id as Id<"users">;
      convexClient = convex;
    }

    if (fromUserIdConvex === (toUserId as Id<"users">)) {
      return NextResponse.json(
        { error: "Cannot send interest to yourself", correlationId },
        { status: 400 }
      );
    }

    const convex = convexClient;

    try {
      const result = await convex
        .mutation(
          action === "send"
            ? api.interests.sendInterest
            : api.interests.removeInterest,
          {
            fromUserId: fromUserIdConvex,
            toUserId: toUserId as Id<"users">,
          }
        )
        .catch((e: unknown) => {
          console.error("Interests action mutation error", {
            scope: "interests.action",
            type: "convex_mutation_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return null;
        });

      if (!result || (typeof result !== "object" && typeof result !== "string")) {
        return NextResponse.json(
          { error: `Failed to ${action} interest`, correlationId },
          { status: 500 }
        );
      }

      const normalised =
        typeof result === "string"
          ? { success: true, interestId: result }
          : result;

      if ("success" in normalised && (normalised as { success?: boolean }).success === false) {
        const errorMsg =
          (normalised as { error?: string })?.error || `Failed to ${action} interest`;
        return NextResponse.json({ error: errorMsg, correlationId }, { status: 429 });
      }

      console.info("Interests action success", {
        scope: "interests.action",
        type: "success",
        correlationId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        action,
      });

      return NextResponse.json({ success: true, result: normalised, correlationId }, { status: 200 });
    } catch (convexErr) {
      const message = convexErr instanceof Error ? convexErr.message : "Unknown error";

      logSecurityEvent(
        "VALIDATION_FAILED",
        { userId, endpoint: "interests", action, error: message, correlationId },
        req
      );

      const isAuthError =
        message.includes("Unauthenticated") ||
        message.includes("token") ||
        message.includes("authentication");

      return NextResponse.json(
        {
          error:
            isAuthError
              ? "Authentication failed"
              : process.env.NODE_ENV === "development"
              ? message
              : `Failed to ${action} interest`,
          correlationId,
        },
        { status: isAuthError ? 401 : 400 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Interests action unhandled error", {
      scope: "interests.action",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const authCheck = await requireUserToken(req);
    if ("errorResponse" in authCheck) {
      const res = authCheck.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      console.warn("Interests GET auth failed", {
        scope: "interests.get",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }
    const { userId: authenticatedUserId } = authCheck;
    // Cookie-only model: token is not provided; keep variable for legacy optional calls
    const token: string | undefined = undefined;

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "User ID is required", correlationId }, { status: 400 });
    }

    const subscriptionRateLimit =
      await subscriptionRateLimiter.checkSubscriptionRateLimit(
        req,
        undefined as unknown as string, // cookie-only: no token; keep signature compatibility
        authenticatedUserId,
        "interest_sent"
      );

    if (!subscriptionRateLimit.allowed) {
      return NextResponse.json(
        { error: subscriptionRateLimit.error || "Subscription limit exceeded", correlationId },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId");

    const convex = getConvexClient();
    if (!convex) {
      console.error("Interests GET convex not configured", {
        scope: "interests.get",
        type: "convex_not_configured",
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Convex client not configured", correlationId },
        { status: 500 }
      );
    }
    try {
      // @ts-ignore optional legacy
      convex.setAuth?.(token);
    } catch {}

    let currentUserRecord;
    try {
      currentUserRecord = await convex.query(
        api.users.getCurrentUserWithProfile,
        {}
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isAuth =
        message.includes("Unauthenticated") || message.includes("token");
      return NextResponse.json(
        {
          error: isAuth ? "Authentication failed" : "Failed to fetch current user",
          correlationId,
        },
        { status: isAuth ? 401 : 400 }
      );
    }

    if (!currentUserRecord) {
      return NextResponse.json({ error: "User not found", correlationId }, { status: 404 });
    }

    const currentUserId = currentUserRecord._id as Id<"users">;

    if (userIdParam && userIdParam !== (currentUserId as unknown as string)) {
      logSecurityEvent(
        "UNAUTHORIZED_ACCESS",
        {
          userId: authenticatedUserId,
          attemptedUserId: userIdParam,
          action: "get_interests",
          correlationId,
        },
        req
      );
      return NextResponse.json(
        { error: "Unauthorized: can only view your own interests", correlationId },
        { status: 403 }
      );
    }

    const userId = currentUserId;

    const result = await convex
      .query(api.interests.getSentInterests, {
        userId: userId as Id<"users">,
      })
      .catch((e: unknown) => {
        console.error("Interests GET query error", {
          scope: "interests.get",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (!result || (typeof result !== "object" && !Array.isArray(result))) {
      return NextResponse.json(
        { error: "Failed to fetch interests", correlationId },
        { status: 500 }
      );
    }

    console.info("Interests GET success", {
      scope: "interests.get",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      count: Array.isArray(result) ? result.length : undefined,
    });

    return NextResponse.json({ success: true, data: result, correlationId }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Interests GET unhandled error", {
      scope: "interests.get",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Failed to fetch interests", correlationId }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleInterestAction(req, "send");
}

export async function DELETE(req: NextRequest) {
  return handleInterestAction(req, "remove");
}
