import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth/requireAuth";

/**
 * POST /api/admin/push-notification
 * Safety controls:
 * - dryRun: boolean to preview payload without sending
 * - confirm: required true to actually send (when dryRun is false)
 * - audience: optional explicit audience segment(s); defaults to "Subscribed Users"
 * - maxAudience: hard cap unless overridden with smaller allowed segments (server-side control is limited by provider)
 */
export async function POST(request: Request) {
  const { role } = await requireAuth(request as unknown as NextRequest);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { title, message, url, dryRun, confirm, audience, maxAudience } =
    (body || {}) as {
      title?: string;
      message?: string;
      url?: string;
      dryRun?: boolean;
      confirm?: boolean;
      audience?: string[] | string; // e.g., ["Subscribed Users"]
      maxAudience?: number; // informational; OneSignal segmentation/capping is provider-side
    };

  if (!title || !message) {
    return errorResponse("Title and message are required", 400, {
      fields: ["title", "message"],
    });
  }

  // Expect ONESIGNAL_APP_ID and ONESIGNAL_API_KEY at the web layer env
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) {
    return errorResponse("OneSignal not configured", 500);
  }

  // Safety: require confirm for live sends; dryRun preview otherwise
  if (!dryRun && confirm !== true) {
    return errorResponse("Confirmation required for live send", 400, {
      hint: "Pass confirm: true or use dryRun: true",
    });
  }

  // Normalize audience; default to Subscribed Users, with guardrails
  const requestedSegments = (
    Array.isArray(audience) ? audience : audience ? [audience] : []
  )
    .filter(Boolean)
    .map((s) => String(s).trim());
  const ALLOWED_SEGMENTS = new Set([
    "Subscribed Users",
    "Active Users",
    "Engaged Last 30d",
    // Future allow-list entries can be appended here when configured in OneSignal:
    // "Churn Risk",
    // "Premium Users",
    // "Trial Users",
  ]);
  const segments = (
    requestedSegments.length ? requestedSegments : ["Subscribed Users"]
  ).filter((s) => ALLOWED_SEGMENTS.has(s));
  if (segments.length === 0) {
    return errorResponse("Invalid audience segment(s)", 400, {
      allowed: Array.from(ALLOWED_SEGMENTS),
    });
  }

  // We cannot hard-cap audience via API without advanced OneSignal filters; expose info only
  const effectiveMax =
    Number.isFinite(maxAudience) && maxAudience
      ? Math.max(1, Math.min(100000, maxAudience))
      : 100000;

  // Dry run: return payload preview only
  if (dryRun) {
    return successResponse({
      dryRun: true,
      preview: {
        app_id: "REDACTED",
        headings: { en: title },
        contents: { en: message },
        included_segments: segments,
        url: url || undefined,
      },
      maxAudience: effectiveMax,
    });
  }

  try {
    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID as string,
      headings: { en: title },
      contents: { en: message },
      included_segments: segments,
      url: url || undefined,
    };

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("OneSignal error", errorData);
      return errorResponse("Failed to queue notification", 500, {
        providerError: errorData,
      });
    }

    return successResponse({
      dryRun: false,
      queued: true,
      segments,
      maxAudience: effectiveMax,
    });
  } catch (err) {
    console.error("Push notification error", err);
    return errorResponse("Unexpected error", 500);
  }
}
