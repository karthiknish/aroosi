import { NextResponse, NextRequest } from "next/server";
import { requireAdminToken } from "@/app/api/_utils/auth";
import { ApiError, apiResponse } from "@/lib/utils/apiResponse";
import {
  MarketingEmailTemplateFn,
  profileCompletionReminderTemplate,
  premiumPromoTemplate,
} from "@/lib/marketingEmailTemplates";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { sendUserNotification } from "@/lib/email";

/**
 * Map of template keys to template functions.
 * Extend this map when new templates are added.
 */
const TEMPLATE_MAP: Record<string, MarketingEmailTemplateFn> = {
  profileCompletionReminder:
    profileCompletionReminderTemplate as unknown as MarketingEmailTemplateFn,
  premiumPromo: premiumPromoTemplate as unknown as MarketingEmailTemplateFn,
};

export async function POST(request: Request) {
  try {
    const adminCheck = requireAdminToken(request as unknown as NextRequest);
    if ("errorResponse" in adminCheck) {
      return adminCheck.errorResponse;
    }

    const body = await request.json();
    const { templateKey, params } = body as {
      templateKey: string;
      params?: Record<string, unknown>;
    };

    if (!templateKey || !(templateKey in TEMPLATE_MAP)) {
      return NextResponse.json(
        apiResponse.validationError({ templateKey: "Invalid template" }),
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    if (!convex) {
      return NextResponse.json(apiResponse.error("Convex not configured"), {
        status: 500,
      });
    }

    const { token } = adminCheck;
    convex.setAuth(token);

    // Fetch first 1000 profiles (adjust as needed)
    const result = await convex.query(api.users.adminListProfiles, {
      search: undefined,
      page: 0,
      pageSize: 1000,
    });

    const profiles: Array<{
      email?: string;
      fullName?: string;
      aboutMe?: string;
      profileImageUrls?: string[];
      images?: string[];
      interests?: string[] | string;
      isProfileComplete?: boolean;
    }> = result?.profiles || [];

    const templateFn = TEMPLATE_MAP[templateKey];

    // Iterate profiles and send emails via Resend
    for (const p of profiles) {
      try {
        let emailPayload;
        if (templateKey === "profileCompletionReminder") {
          const completion = p.isProfileComplete ? 100 : 70;
          emailPayload = templateFn(p as never, completion, "");
        } else if (templateKey === "premiumPromo") {
          emailPayload = templateFn(p as never, 30, "");
        } else {
          emailPayload = templateFn(
            p as never,
            ...((params?.args || []) as unknown[]),
            ""
          );
        }
        if (p.email) {
          await sendUserNotification(
            p.email,
            emailPayload.subject,
            emailPayload.html
          );
        }
      } catch (err) {
        console.error("Failed to send marketing email to", p.email, err);
      }
    }

    return NextResponse.json(apiResponse.success(null, "Emails queued"));
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Unexpected error";
    return NextResponse.json(apiResponse.error(message), { status: 500 });
  }
}
