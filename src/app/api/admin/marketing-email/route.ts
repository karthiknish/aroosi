import { NextResponse, NextRequest } from "next/server";
import { requireAdminToken } from "@/app/api/_utils/auth";
import { ApiError, apiResponse } from "@/lib/utils/apiResponse";
import {
  MarketingEmailTemplateFn,
  profileCompletionReminderTemplate,
  premiumPromoTemplate,
} from "@/lib/marketingEmailTemplates";

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
    const { templateKey } = body as { templateKey: string };

    if (!templateKey || !(templateKey in TEMPLATE_MAP)) {
      return NextResponse.json(
        apiResponse.validationError({ templateKey: "Invalid template" }),
        { status: 400 }
      );
    }

    // TODO: Replace with actual database query to fetch user profiles
    const profiles: unknown[] = [];

    const templateFn = TEMPLATE_MAP[templateKey];

    // Placeholder loop; integration pending
    profiles.forEach((p) => {
      const payload = templateFn(p as never, 80, "");
      console.log("Prepared email:", payload.subject);
    });

    return NextResponse.json(apiResponse.success(null, "Emails queued"));
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Unexpected error";
    return NextResponse.json(apiResponse.error(message), { status: 500 });
  }
}
