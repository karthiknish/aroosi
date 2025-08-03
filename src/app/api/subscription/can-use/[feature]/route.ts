import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { requireUserToken } from "@/app/api/_utils/auth";

/**
 * IMPORTANT:
 * We use app-layer auth. Do NOT pass the app JWT to Convex (no convex.setAuth).
 * Instead, identify the current Convex user via server-side queries and use that identity.
 *
 * Also: Prevent implicit domain redirect (307) by forcing JSON and absolute URL handling,
 * and by returning explicit NextResponse JSON without delegating to helpers that might revalidate.
 */

const validFeatures = [
  "message_sent",
  "profile_view",
  "search_performed",
  "interest_sent",
  "profile_boost_used",
  "voice_message_sent",
] as const;

type Feature = (typeof validFeatures)[number];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ feature: string }> }
) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  // Force JSON response type; explicitly avoid redirects
  const json = (data: unknown, status = 200) =>
    new NextResponse(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    // Require an app-layer user token for gating the endpoint
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) {
      // Normalize helper response to plain JSON to avoid any revalidation/redirect behavior
      const res = authCheck.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {
        // keep default
      }
      console.warn("Subscription can-use auth failed", {
        scope: "subscription.can_use",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return json(body, status);
    }

    const params = await context.params;
    const feature = params.feature as Feature;
    if (!validFeatures.includes(feature)) {
      console.warn("Subscription can-use invalid feature", {
        scope: "subscription.can_use",
        type: "invalid_feature",
        feature,
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return json(
        {
          error: `Invalid feature. Must be one of: ${validFeatures.join(", ")}`,
          correlationId,
        },
        400
      );
    }

    const convex = getConvexClient();
    if (!convex) {
      console.error("Subscription can-use convex not configured", {
        scope: "subscription.can_use",
        type: "convex_not_configured",
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return json(
        { error: "Convex client not configured", correlationId },
        500
      );
    }

    // App-layer auth: DO NOT call convex.setAuth(token)
    // Resolve Convex identity using server function
    const current = await convex
      .query(api.users.getCurrentUserWithProfile, {})
      .catch((e: unknown) => {
        console.error("Subscription can-use identity error", {
          scope: "subscription.can_use",
          type: "identity_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    // current is shaped like { user, profile } per server function contract; be defensive on typing
    const userId =
      (current as { user?: { _id?: unknown } } | null)?.user?._id ??
      (current as { _id?: unknown } | null)?._id ??
      null;

    if (!userId) {
      console.warn("Subscription can-use user not found", {
        scope: "subscription.can_use",
        type: "user_not_found",
        correlationId,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return json({ error: "User not found in database", correlationId }, 404);
    }

    // Check if user can use the feature using server-enforced identity
    const result = await convex
      .query(api.usageTracking.checkActionLimit, {
        action: feature,
        // userId,
      })
      .catch((e: unknown) => {
        console.error("Subscription can-use check error", {
          scope: "subscription.can_use",
          type: "check_error",
          feature,
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (result == null) {
      return json(
        {
          error: "Failed to check feature availability",
          correlationId,
        },
        500
      );
    }

    const response = json({ success: true, data: result, correlationId }, 200);

    console.info("Subscription can-use success", {
      scope: "subscription.can_use",
      type: "success",
      feature,
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Subscription can-use unhandled error", {
      scope: "subscription.can_use",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return json(
      {
        error: "Failed to check feature availability",
        details: message,
        correlationId,
      },
      500
    );
  }
}