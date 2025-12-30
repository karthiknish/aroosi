import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";

/**
 * POST /api/admin/push-notification
 * Safety controls:
 * - dryRun: boolean to preview payload without sending
 * - confirm: required true to actually send (when dryRun is false)
 * - audience: optional explicit audience segment(s); defaults to "Subscribed Users"
 * - maxAudience: hard cap unless overridden with smaller allowed segments (server-side control is limited by provider)
 */
export async function POST(request: NextRequest) {
  const { role, userId, email } = await requireAuth(request);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // Accept an extended set of fields supported by OneSignal's classic API
  const {
    title,
    message,
    url,
    imageUrl,
    templateId,
    dryRun,
    confirm,
    audience,
    excludedSegments,
    includePlayerIds,
    includeExternalUserIds,
    filters,
    data,
    buttons,
    androidChannelId,
    ttl,
    priority,
    collapseId,
    iosBadgeType,
    iosBadgeCount,
    iosSound,
    androidSound,
    iosInterruptionLevel,
    mutableContent,
    contentAvailable,
    delayedOption,
    sendAfter,
    deliveryTimeOfDay,
    throttlePerMinute,
    maxAudience,
  } = (body || {}) as {
    title?: string;
    message?: string;
    url?: string;
    imageUrl?: string;
    templateId?: string;
    dryRun?: boolean;
    confirm?: boolean;
    audience?: string[] | string; // included_segments
    excludedSegments?: string[] | string; // excluded_segments
    includePlayerIds?: string[]; // include_player_ids
    includeExternalUserIds?: string[]; // include_external_user_ids
    filters?: any[]; // OneSignal filters array
    data?: Record<string, any>; // Custom data payload
    buttons?: Array<{ id: string; text: string; icon?: string; url?: string }>;
    androidChannelId?: string; // android_channel_id
    ttl?: number; // seconds
    priority?: "normal" | "high" | number; // maps to OneSignal priority
    collapseId?: string; // collapse_id
    iosBadgeType?: "None" | "SetTo" | "Increase";
    iosBadgeCount?: number;
    iosSound?: string;
    androidSound?: string;
    iosInterruptionLevel?: "active" | "passive" | "time-sensitive" | "critical";
    mutableContent?: boolean;
    contentAvailable?: boolean;
    delayedOption?: "immediate" | "timezone" | "last-active";
    sendAfter?: string; // ISO datetime string
    deliveryTimeOfDay?: string; // HH:MM:SS (for timezone delivery)
    throttlePerMinute?: number; // throttle_rate_per_minute
    maxAudience?: number; // informational; provider-side controls actually cap
  };

  if (!title || !message) {
    return errorResponse("Title and message are required", 400, {
      details: { fields: ["title", "message"] },
    });
  }

  // Expect ONESIGNAL_APP_ID and ONESIGNAL_API_KEY at the web layer env
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) {
    return errorResponse("OneSignal not configured", 500);
  }

  // Safety: require confirm for live sends; dryRun preview otherwise
  if (!dryRun && confirm !== true) {
    return errorResponse("Confirmation required for live send", 400, {
      details: { hint: "Pass confirm: true or use dryRun: true" },
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
      details: { allowed: Array.from(ALLOWED_SEGMENTS) },
    });
  }

  // Normalize optional targeting inputs
  const excluded = Array.isArray(excludedSegments)
    ? excludedSegments
    : excludedSegments
      ? [excludedSegments]
      : [];
  const playerIds = Array.isArray(includePlayerIds)
    ? includePlayerIds.filter(Boolean)
    : [];
  const externalUserIds = Array.isArray(includeExternalUserIds)
    ? includeExternalUserIds.filter(Boolean)
    : [];

  // We cannot hard-cap audience via API without advanced OneSignal filters; expose info only
  const effectiveMax =
    Number.isFinite(maxAudience) && maxAudience
      ? Math.max(1, Math.min(100000, maxAudience))
      : 100000;

  // Basic server-side validation hints (non-exhaustive but helpful)
  // Buttons schema
  if (buttons !== undefined) {
    if (!Array.isArray(buttons)) {
      return errorResponse("buttons must be an array", 400, {
        details: { hint: "Provide an array of { id, text, icon?, url? }" },
      });
    }
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i] as any;
      if (!b || typeof b !== "object")
        return errorResponse("Invalid button entry", 400, {
          details: { index: i, hint: "Each button must be an object" },
        });
      if (!b.id || typeof b.id !== "string")
        return errorResponse("Button id required", 400, {
          details: {
            index: i,
            hint: "buttons[i].id must be a non-empty string",
          },
        });
      if (!b.text || typeof b.text !== "string")
        return errorResponse("Button text required", 400, {
          details: {
            index: i,
            hint: "buttons[i].text must be a non-empty string",
          },
        });
      if (b.icon && typeof b.icon !== "string")
        return errorResponse("Invalid button icon", 400, {
          details: {
            index: i,
            hint: "buttons[i].icon must be a string if provided",
          },
        });
      if (b.url && typeof b.url !== "string")
        return errorResponse("Invalid button url", 400, {
          details: {
            index: i,
            hint: "buttons[i].url must be a string if provided",
          },
        });
    }
  }

  // Custom data must be an object if provided
  if (data !== undefined && (typeof data !== "object" || data === null)) {
    return errorResponse("data must be a JSON object", 400, {
      details: { hint: "Provide a key/value object for custom data" },
    });
  }

  // Scheduling validation
  if (deliveryTimeOfDay) {
    // Expect HH:MM or HH:MM:SS (24h)
    const timeOk = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(
      deliveryTimeOfDay
    );
    if (!timeOk) {
      return errorResponse("Invalid deliveryTimeOfDay format", 400, {
        details: { hint: "Use HH:MM or HH:MM:SS (24h)" },
      });
    }
    if (delayedOption !== "timezone") {
      return errorResponse(
        "deliveryTimeOfDay requires delayedOption=timezone",
        400,
        {
          details: {
            hint: "Set delayedOption to 'timezone' when using deliveryTimeOfDay",
          },
        }
      );
    }
  }
  if (sendAfter) {
    const date = new Date(sendAfter);
    if (Number.isNaN(date.getTime())) {
      return errorResponse("sendAfter must be an ISO datetime string", 400);
    }
  }

  // iOS badge validation
  if (iosBadgeType && !["None", "SetTo", "Increase"].includes(iosBadgeType)) {
    return errorResponse("Invalid iosBadgeType", 400, {
      details: { allowed: ["None", "SetTo", "Increase"] },
    });
  }
  if (iosBadgeType && iosBadgeType !== "None") {
    if (
      !Number.isFinite(iosBadgeCount as number) ||
      (iosBadgeCount as number) < 0
    ) {
      return errorResponse("iosBadgeCount must be a non-negative number", 400);
    }
  }

  // filters validation (basic)
  if (filters !== undefined) {
    if (!Array.isArray(filters)) {
      return errorResponse("filters must be an array", 400);
    }
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i] as any;
      if (f && typeof f === "object" && typeof f.operator === "string") {
        if (f.operator !== "OR") {
          return errorResponse("Invalid filter operator", 400, {
            details: { index: i, allowed: ["OR"] },
          });
        }
        continue;
      }
      if (!f || typeof f !== "object")
        return errorResponse("Invalid filter item", 400, {
          details: { index: i },
        });
      if (!f.field || typeof f.field !== "string")
        return errorResponse("Filter field required", 400, {
          details: { index: i },
        });
      const field = String(f.field);
      if (field === "tag") {
        if (!f.key || typeof f.key !== "string")
          return errorResponse("Tag key required", 400, { details: { index: i } });
        const allowed = ["=", "!=", ">", "<", "exists", "not_exists"];
        if (!allowed.includes(f.relation))
          return errorResponse("Invalid tag relation", 400, {
            details: { index: i, allowed },
          });
        if (f.relation !== "exists" && f.relation !== "not_exists") {
          if (typeof f.value !== "string" && typeof f.value !== "number") {
            return errorResponse("Tag value must be string or number", 400, {
              details: { index: i },
            });
          }
        }
      } else if (field === "language" || field === "country") {
        const allowed = ["=", "!="];
        if (!allowed.includes(f.relation))
          return errorResponse("Invalid relation for language/country", 400, {
            details: { index: i, allowed },
          });
        if (typeof f.value !== "string")
          return errorResponse("value must be a string", 400, { details: { index: i } });
      } else if (field === "last_session") {
        const allowed = ["<", ">"];
        if (!allowed.includes(f.relation))
          return errorResponse("Invalid relation for last_session", 400, {
            details: { index: i, allowed },
          });
        const n = Number(f.hours_ago);
        if (!Number.isFinite(n) || n < 0)
          return errorResponse("hours_ago must be a non-negative number", 400, {
            details: { index: i },
          });
      } else if (field === "session_count" || field === "amount_spent") {
        const allowed = ["=", "!=", ">", "<"];
        if (!allowed.includes(f.relation))
          return errorResponse(`Invalid relation for ${field}`, 400, {
            details: { index: i, allowed },
          });
        const n = Number(f.value);
        if (!Number.isFinite(n) || n < 0)
          return errorResponse("value must be a non-negative number", 400, {
            details: { index: i },
          });
      }
    }
  }

  // Dry run: return payload preview only
  if (dryRun) {
    // audit log (dry-run)
    try {
      await db.collection("adminSends").add({
        type: "push",
        mode: "dry-run",
        createdAt: Date.now(),
        actor: { userId, email },
        templateId: (body as any)?.templateId || null,
        audience: {
          segments,
          excludedSegments: excluded,
          includePlayerIdsCount: Array.isArray(includePlayerIds)
            ? includePlayerIds.filter(Boolean).length
            : 0,
          includeExternalUserIdsCount: Array.isArray(includeExternalUserIds)
            ? includeExternalUserIds.filter(Boolean).length
            : 0,
          filtersCount: Array.isArray(filters) ? filters.length : 0,
        },
        previewOnly: true,
      });
    } catch (e) {
      console.warn("Failed to write admin send log (push dry-run)", e);
    }
    return successResponse({
      dryRun: true,
      preview: {
        app_id: "REDACTED",
        headings: { en: title },
        contents: { en: message },
        included_segments: segments,
        excluded_segments: excluded.length ? excluded : undefined,
        include_player_ids: playerIds.length ? playerIds : undefined,
        include_external_user_ids: externalUserIds.length
          ? externalUserIds
          : undefined,
        url: url || undefined,
        big_picture: imageUrl || undefined,
        ios_attachments: imageUrl ? { id: imageUrl } : undefined,
        data: data || undefined,
        buttons: buttons || undefined,
        android_channel_id: androidChannelId || undefined,
        ttl: Number.isFinite(ttl as number) ? ttl : undefined,
        priority: normalizePriority(priority),
        collapse_id: collapseId || undefined,
        ios_badgeType: iosBadgeType || undefined,
        ios_badgeCount: iosBadgeCount || undefined,
        ios_sound: iosSound || undefined,
        android_sound: androidSound || undefined,
        ios_interruption_level: iosInterruptionLevel || undefined,
        mutable_content: !!mutableContent || undefined,
        content_available: !!contentAvailable || undefined,
        delayed_option: normalizeDelayedOption(delayedOption),
        send_after: sendAfter || undefined,
        delivery_time_of_day: deliveryTimeOfDay || undefined,
        throttle_rate_per_minute: Number.isFinite(throttlePerMinute as number)
          ? throttlePerMinute
          : undefined,
        filters: Array.isArray(filters) && filters.length ? filters : undefined,
      },
      maxAudience: effectiveMax,
    });
  }

  try {
    const payload: Record<string, any> = {
      app_id: process.env.ONESIGNAL_APP_ID as string,
      headings: { en: title },
      contents: { en: message },
      included_segments: segments,
    };

    // Targeting
    if (excluded.length) payload.excluded_segments = excluded;
    if (playerIds.length) payload.include_player_ids = playerIds;
    if (externalUserIds.length)
      payload.include_external_user_ids = externalUserIds;
    if (Array.isArray(filters) && filters.length) payload.filters = filters;

    // Content and rich media
    if (url) payload.url = url;
    if (imageUrl) {
      payload.big_picture = imageUrl; // Android
      payload.ios_attachments = { id: imageUrl }; // iOS
      payload.chrome_web_image = imageUrl; // Web
    }
    if (data && typeof data === "object") payload.data = data;
    if (Array.isArray(buttons) && buttons.length) {
      payload.buttons = buttons.map((b) => ({
        id: b.id,
        text: b.text,
        icon: b.icon,
        url: b.url,
      }));
      payload.web_buttons = payload.buttons;
    }

    // Delivery options
    if (androidChannelId) payload.android_channel_id = androidChannelId;
    if (Number.isFinite(ttl as number)) payload.ttl = ttl;
    const p = normalizePriority(priority);
    if (typeof p !== "undefined") payload.priority = p;
    if (collapseId) payload.collapse_id = collapseId;
    if (iosBadgeType) payload.ios_badgeType = iosBadgeType;
    if (Number.isFinite(iosBadgeCount as number))
      payload.ios_badgeCount = iosBadgeCount;
    if (iosSound) payload.ios_sound = iosSound;
    if (androidSound) payload.android_sound = androidSound;
    if (iosInterruptionLevel)
      payload.ios_interruption_level = iosInterruptionLevel;
    if (mutableContent !== undefined)
      payload.mutable_content = !!mutableContent;
    if (contentAvailable !== undefined)
      payload.content_available = !!contentAvailable;

    // Scheduling
    const dopt = normalizeDelayedOption(delayedOption);
    if (dopt) payload.delayed_option = dopt;
    if (sendAfter) payload.send_after = sendAfter;
    if (deliveryTimeOfDay) payload.delivery_time_of_day = deliveryTimeOfDay;
    if (Number.isFinite(throttlePerMinute as number))
      payload.throttle_rate_per_minute = throttlePerMinute;

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
      // audit error case
      try {
        await db.collection("adminSends").add({
          type: "push",
          mode: "live",
          createdAt: Date.now(),
          actor: { userId, email },
          templateId: templateId || null,
          audience: {
            segments,
            excludedSegments: excluded,
            includePlayerIdsCount: playerIds.length,
            includeExternalUserIdsCount: externalUserIds.length,
            filtersCount: Array.isArray(filters) ? filters.length : 0,
          },
          status: "error",
          providerError: errorData,
        });
      } catch (e) {
        console.warn("Failed to write admin send log (push error)", e);
      }
      return errorResponse("Failed to queue notification", 500, {
        details: { providerError: errorData },
      });
    }

    // Update template lastUsedAt if provided
    if (templateId && typeof templateId === "string") {
      try {
        await db
          .collection("pushTemplates")
          .doc(templateId)
          .set({ lastUsedAt: Date.now() }, { merge: true });
      } catch (e) {
        console.warn(
          "Failed to update push template lastUsedAt",
          templateId,
          e
        );
      }
    }

    // audit success case
    try {
      await db.collection("adminSends").add({
        type: "push",
        mode: "live",
        createdAt: Date.now(),
        actor: { userId, email },
        templateId: templateId || null,
        audience: {
          segments,
          excludedSegments: excluded,
          includePlayerIdsCount: playerIds.length,
          includeExternalUserIdsCount: externalUserIds.length,
          filtersCount: Array.isArray(filters) ? filters.length : 0,
        },
        status: "queued",
      });
    } catch (e) {
      console.warn("Failed to write admin send log (push success)", e);
    }

    return successResponse({
      dryRun: false,
      queued: true,
      segments,
      maxAudience: effectiveMax,
    });
  } catch (err) {
    console.error("Push notification error", err);
    try {
      await db.collection("adminSends").add({
        type: "push",
        mode: "live",
        createdAt: Date.now(),
        actor: { userId, email },
        templateId: (body as any)?.templateId || null,
        status: "error",
        error: String(err),
      });
    } catch (e) {
      console.warn("Failed to write admin send log (push catch)", e);
    }
    return errorResponse("Unexpected error", 500);
  }
}

// Helpers
function normalizePriority(
  priority: "normal" | "high" | number | undefined
): number | undefined {
  if (priority === undefined) return undefined;
  if (typeof priority === "number") return priority;
  if (priority === "high") return 10; // OneSignal high
  if (priority === "normal") return 5; // OneSignal normal
  return undefined;
}

function normalizeDelayedOption(
  val: "immediate" | "timezone" | "last-active" | undefined
): "timezone" | "last-active" | undefined {
  if (!val || val === "immediate") return undefined;
  if (val === "timezone") return "timezone";
  if (val === "last-active") return "last-active";
  return undefined;
}
