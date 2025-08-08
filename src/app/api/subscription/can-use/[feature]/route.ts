import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getSessionFromRequest } from "@/app/api/_utils/authSession";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { successResponse, errorResponse } from "@/lib/apiResponse";

/**
 * Prevent 307 domain redirects and enforce JSON-only responses with structured logs.
 * This endpoint uses app-layer auth and never passes tokens to Convex.
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
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ feature: string }> }
) {
  const scope = "api/subscription/can-use#GET";
  const correlationId =
    request.headers.get("x-request-id") ||
    Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  // All responses use shared success/error helpers for consistent shape

  try {
    // Gate with app-layer auth; normalize any helper response into plain JSON
    const session = await getSessionFromRequest(request);
    if (!session.ok) {
      const res = session.errorResponse!;
      const status = res.status || 401;
      let body: Record<string, unknown> = {
        error: "Unauthorized",
        correlationId,
      };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {
        // fall through with default body
      }
      log(scope, "warn", "Auth failed", {
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return errorResponse(body?.error || "Unauthorized", status, body);
    }

    const params = await context.params;
    const rawFeature = params?.feature;
    const feature = rawFeature as Feature;

    if (!rawFeature || !validFeatures.includes(feature)) {
      log(scope, "warn", "Invalid feature", {
        correlationId,
        feature: rawFeature,
        valid: validFeatures,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return errorResponse("Invalid feature", 400, {
        reason: `Must be one of: ${validFeatures.join(", ")}`,
        feature: rawFeature ?? null,
        correlationId,
      });
    }

    const userId = session.userId;

    if (!userId) {
      log(scope, "warn", "User not found", {
        correlationId,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return json({ error: "User not found in database", correlationId }, 404);
    }

    let result: any = null;
    try {
      result = await convexQueryWithAuth(
        request,
        api.usageTracking.checkActionLimit,
        {
          action: feature,
        }
      );
    } catch (e: unknown) {
      log(scope, "error", "Feature check failed", {
        correlationId,
        feature,
        statusCode: 500,
        message: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - startedAt,
      });
      return errorResponse("Failed to check feature availability", 500, {
        correlationId,
      });
    }

    const responseBody = { ...result, correlationId };
    log(scope, "info", "Feature check success", {
      correlationId,
      feature,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return successResponse(responseBody, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(scope, "error", "Unhandled error", {
      correlationId,
      statusCode: 500,
      message,
      durationMs: Date.now() - startedAt,
    });
    return errorResponse("Failed to check feature availability", 500, {
      details: message,
      correlationId,
    });
  }
}
