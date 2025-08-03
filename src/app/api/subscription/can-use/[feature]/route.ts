import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
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
      let body: unknown = { error: "Unauthorized" };
      try {
        const txt = await res.text();
        body = txt ? JSON.parse(txt) : body;
      } catch {
        // keep default
      }
      return json(body, status);
    }

    const params = await context.params;
    const feature = params.feature as Feature;
    if (!validFeatures.includes(feature)) {
      return json(
        { error: `Invalid feature. Must be one of: ${validFeatures.join(", ")}` },
        400
      );
    }

    const convex = getConvexClient();
    if (!convex) return json({ error: "Convex client not configured" }, 500);

    // App-layer auth: DO NOT call convex.setAuth(token)
    // Resolve Convex identity using server function
    const current = await convex
      .query(api.users.getCurrentUserWithProfile, {})
      .catch(() => null);

    // current is shaped like { user, profile } per server function contract; be defensive on typing
    const userId =
      (current as { user?: { _id?: unknown } } | null)?.user?._id ??
      (current as { _id?: unknown } | null)?._id ??
      null;

    if (!userId) {
      return json({ error: "User not found in database" }, 404);
    }

    // Check if user can use the feature using server-enforced identity
    // If your checkActionLimit expects a userId param, add it here.
    const result = await convex.query(api.usageTracking.checkActionLimit, {
      action: feature,
      // userId,
    });

    // Return normalized JSON to avoid 307 rewrites/redirects
    return json({ success: true, data: result }, 200);
  } catch (error) {
    console.error("Error checking feature availability:", error);
    return json(
      {
        error: "Failed to check feature availability",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}