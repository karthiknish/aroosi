import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";
import {
  COL_USAGE_EVENTS,
  COL_USAGE_MONTHLY,
  monthKey,
  usageMonthlyId,
} from "@/lib/firestoreSchema";
import { getPlanLimits, featureRemaining } from "@/lib/subscription/planLimits";

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
  // Lightweight read-only poll for unread counts (added)
  "unread_counts",
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
    let auth;
    try {
      auth = await requireAuth(request);
    } catch (e) {
      const err = e as AuthError;
      log(scope, "warn", "Auth failed", {
        correlationId,
        statusCode: err.status,
        durationMs: Date.now() - startedAt,
      });
      return errorResponse(err.message, err.status, { correlationId });
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

    const userId = auth.userId;
    const profileDoc = await db.collection("users").doc(userId).get();
    if (!profileDoc.exists)
      return errorResponse("Profile not found", 404, { correlationId });
    const profile = profileDoc.data() as any;
    const plan = profile.subscriptionPlan || "free";
    const limits = getPlanLimits(plan);
    const limit = limits[feature];
    let currentUsage = 0;
    const month = monthKey();
    if (feature === "profile_view" || feature === "search_performed") {
      const since = Date.now() - 24 * 60 * 60 * 1000;
      try {
        const snap = await db
          .collection(COL_USAGE_EVENTS)
          .where("userId", "==", userId)
          .where("timestamp", ">=", since)
          .get();
        snap.docs.forEach(
          (
            d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
          ) => {
            const data = d.data() as any;
            if (data.feature === feature) currentUsage++;
          }
        );
      } catch (idxErr: any) {
        // Graceful fallback if composite index not yet built
        if (
          typeof idxErr?.message === "string" &&
          idxErr.message.includes("FAILED_PRECONDITION")
        ) {
          log(
            scope,
            "warn",
            "Index missing; falling back to optimistic allowance",
            {
              correlationId,
              feature,
              statusCode: 200,
              fallback: true,
            }
          );
          currentUsage = 0; // treat as unused so the feature is not blocked
        } else {
          throw idxErr;
        }
      }
    } else {
      const monthlyId = usageMonthlyId(userId, feature, month);
      const monthlySnap = await db
        .collection(COL_USAGE_MONTHLY)
        .doc(monthlyId)
        .get();
      currentUsage = monthlySnap.exists
        ? (monthlySnap.data() as any).count || 0
        : 0;
    }
    const rem = featureRemaining(plan, feature as any, currentUsage);
    const canPerform = rem.unlimited || currentUsage < rem.limit;
    const remaining = rem.remaining;
    const responseBody = {
      canUse: canPerform,
      currentUsage,
      limit: rem.limit,
      remaining,
      plan,
      correlationId,
    };
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
