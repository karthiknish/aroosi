import {
  createAuthenticatedHandler,
  errorResponse,
  successResponse,
} from "@/lib/api/handler";
import type { AuthenticatedApiContext } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import type { NotificationSettings } from "@aroosi/shared/types";

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  matches: true,
  messages: true,
  likes: true,
  superLikes: true,
  dailyPicks: true,
  promotions: false,
};

function normalizeSettings(raw: unknown): NotificationSettings {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  const source = raw as Record<string, unknown>;

  return {
    matches:
      typeof source.matches === "boolean"
        ? source.matches
        : DEFAULT_NOTIFICATION_SETTINGS.matches,
    messages:
      typeof source.messages === "boolean"
        ? source.messages
        : DEFAULT_NOTIFICATION_SETTINGS.messages,
    likes:
      typeof source.likes === "boolean"
        ? source.likes
        : DEFAULT_NOTIFICATION_SETTINGS.likes,
    superLikes:
      typeof source.superLikes === "boolean"
        ? source.superLikes
        : DEFAULT_NOTIFICATION_SETTINGS.superLikes,
    dailyPicks:
      typeof source.dailyPicks === "boolean"
        ? source.dailyPicks
        : DEFAULT_NOTIFICATION_SETTINGS.dailyPicks,
    promotions:
      typeof source.promotions === "boolean"
        ? source.promotions
        : DEFAULT_NOTIFICATION_SETTINGS.promotions,
  };
}

export const GET = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  try {
    const userId = ctx.user.id;
    const userSnap = await db.collection("users").doc(userId).get();
    const userData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};

    const settings = normalizeSettings(
      userData.notificationSettings || userData.notificationPreferences
    );

    return successResponse(settings, 200, ctx.correlationId);
  } catch (error) {
    console.error("notifications/settings GET error", error);
    return errorResponse("Failed to fetch notification settings", 500, {
      correlationId: ctx.correlationId,
    });
  }
});

export const PATCH = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  try {
    const userId = ctx.user.id;

    let body: Record<string, unknown> = {};
    try {
      const parsed = await ctx.request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore invalid JSON and fall through to validation.
    }

    const candidate =
      body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
        ? body.settings
        : body;
    const settings = normalizeSettings(candidate);

    await db.collection("users").doc(userId).set(
      {
        notificationSettings: settings,
        notificationPreferences: {
          messages: settings.messages,
          matches: settings.matches,
          likes: settings.likes,
          promotions: settings.promotions,
        },
      },
      { merge: true }
    );

    return successResponse(settings, 200, ctx.correlationId);
  } catch (error) {
    console.error("notifications/settings PATCH error", error);
    return errorResponse("Failed to update notification settings", 500, {
      correlationId: ctx.correlationId,
    });
  }
});