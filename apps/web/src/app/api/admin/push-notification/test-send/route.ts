import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
  const { role } = await requireAuth(request as unknown as NextRequest);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const { playerId, title, message, url, imageUrl, data, buttons } = body || {};
  if (!playerId || !String(playerId).trim())
    return errorResponse("playerId required", 400);
  if (!title || !message)
    return errorResponse("Title and message are required", 400);

  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) {
    return errorResponse("OneSignal not configured", 500);
  }

  const payload: Record<string, any> = {
    app_id: process.env.ONESIGNAL_APP_ID as string,
    headings: { en: title },
    contents: { en: message },
    include_player_ids: [String(playerId)],
    url: url || undefined,
  };
  if (imageUrl) {
    payload.big_picture = imageUrl;
    payload.ios_attachments = { id: imageUrl };
    payload.chrome_web_image = imageUrl;
  }
  if (data && typeof data === "object") payload.data = data;
  if (Array.isArray(buttons) && buttons.length) payload.buttons = buttons;
  try {
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
      console.error("OneSignal test-send error", errorData);
      return errorResponse("Failed to queue test notification", 500, {
        providerError: errorData,
      });
    }
    return successResponse({ queued: true });
  } catch (err) {
    console.error("test-send error", err);
    return errorResponse("Unexpected error", 500);
  }
}
