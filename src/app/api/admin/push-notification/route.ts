import { NextRequest, NextResponse } from "next/server";
import { requireAdminToken } from "@/app/api/_utils/auth";
import { apiResponse } from "@/lib/utils/apiResponse";

export async function POST(request: Request) {
  const admin = requireAdminToken(request as unknown as NextRequest);
  if ("errorResponse" in admin) {
    return admin.errorResponse;
  }

  const { title, message, url } = (await request.json()) as {
    title?: string;
    message?: string;
    url?: string;
  };

  if (!title || !message) {
    return NextResponse.json(
      apiResponse.validationError({
        title: "Title required",
        message: "Message required",
      }),
      { status: 400 }
    );
  }

  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) {
    return NextResponse.json(apiResponse.error("OneSignal not configured"), {
      status: 500,
    });
  }

  try {
    const body = {
      app_id: process.env.ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: ["Subscribed Users"],
      url: url || undefined,
    };

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("OneSignal error", errorData);
      return NextResponse.json(
        apiResponse.error("Failed to queue notification"),
        { status: 500 }
      );
    }

    return NextResponse.json(apiResponse.success(null, "Notification queued"));
  } catch (err) {
    console.error("Push notification error", err);
    return NextResponse.json(apiResponse.error("Unexpected error"), {
      status: 500,
    });
  }
}
