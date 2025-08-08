import { NextRequest } from "next/server";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import {
  MarketingEmailTemplateFn,
  profileCompletionReminderTemplate,
  premiumPromoTemplate,
  recommendedProfilesTemplate,
  reEngagementTemplate,
  successStoryTemplate,
  weeklyMatchesDigestTemplate,
  welcomeDay1Template,
} from "@/lib/marketingEmailTemplates";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { api } from "@convex/_generated/api";
import { sendUserNotification } from "@/lib/email";
import type { Profile } from "@/types/profile";

const TEMPLATE_MAP: Record<string, MarketingEmailTemplateFn> = {
  profileCompletionReminder:
    profileCompletionReminderTemplate as unknown as MarketingEmailTemplateFn,
  premiumPromo: premiumPromoTemplate as unknown as MarketingEmailTemplateFn,
  recommendedProfiles:
    recommendedProfilesTemplate as unknown as MarketingEmailTemplateFn,
  reEngagement: reEngagementTemplate as unknown as MarketingEmailTemplateFn,
  successStory: successStoryTemplate as unknown as MarketingEmailTemplateFn,
  weeklyDigest:
    weeklyMatchesDigestTemplate as unknown as MarketingEmailTemplateFn,
  welcomeDay1: welcomeDay1Template as unknown as MarketingEmailTemplateFn,
};

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdminSession(
      request as unknown as NextRequest
    );
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
    const { userId } = adminCheck;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const {
      templateKey,
      params,
      dryRun,
      confirm,
      maxAudience,
      subject,
      body: customBody,
    } = (body || {}) as {
      templateKey?: string;
      params?: { args?: unknown[] };
      dryRun?: boolean;
      confirm?: boolean;
      maxAudience?: number;
      subject?: string;
      body?: string;
    };

    if (!templateKey && !subject) {
      return errorResponse("Provide a templateKey or custom subject/body", 400);
    }
    if (templateKey && !(templateKey in TEMPLATE_MAP)) {
      return errorResponse("Invalid template", 400, { field: "templateKey" });
    }

    // Safety switches: require confirm for live send; enforce audience cap
    const effectiveMax = Number.isFinite(maxAudience)
      ? Math.max(1, Math.min(10000, Number(maxAudience)))
      : 1000;
    if (!dryRun && confirm !== true) {
      return errorResponse("Confirmation required for live send", 400, {
        hint: "Pass confirm: true or use dryRun: true",
      });
    }

    // Fetch candidate audience
    const result = await convexQueryWithAuth(
      request as unknown as NextRequest,
      api.users.adminListProfiles,
      {
        search: undefined,
        page: 0,
        pageSize: effectiveMax,
      } as any
    );

    // Be tolerant to backend shape; only pick what we need and keep optionals
    const profiles = (
      Array.isArray(result?.profiles) ? result.profiles : []
    ) as Array<
      Partial<
        Pick<
          Profile,
          | "email"
          | "fullName"
          | "aboutMe"
          | "profileImageUrls"
          | "images"
          | "interests"
          | "isProfileComplete"
        >
      > & {
        email?: string;
      }
    >;

    const templateFn = templateKey ? TEMPLATE_MAP[templateKey] : null;

    // If dryRun, return preview count and first few preview payloads
    if (dryRun) {
      const previews: Array<{ email?: string; subject: string }> = [];
      const sample = profiles.slice(0, Math.min(5, profiles.length));
      for (const p of sample) {
        // Guard missing fields for type safety
        const baseProfile = {
          ...(p as Profile),
          email: p.email || "",
          fullName: (p as Profile).fullName || "",
        } as Profile;

        const payload = templateFn
          ? templateKey === "profileCompletionReminder"
            ? templateFn(baseProfile, p.isProfileComplete ? 100 : 70, "")
            : templateKey === "premiumPromo"
              ? templateFn(baseProfile, 30, "")
              : templateKey === "recommendedProfiles"
                ? templateFn(baseProfile, [], "")
                : templateFn(
                    baseProfile,
                    ...((params?.args || []) as unknown[]),
                    ""
                  )
          : { subject: subject || "(no subject)", html: customBody || "" };

        previews.push({ email: p.email, subject: payload.subject });
      }
      return successResponse({
        dryRun: true,
        totalCandidates: profiles.length,
        previewCount: previews.length,
        previews,
        maxAudience: effectiveMax,
        actorId: userId,
      });
    }

    // Live send with batching (simple sequential loop retained, can optimize later)
    let sent = 0;
    for (const p of profiles) {
      try {
        const baseProfile = {
          ...(p as Profile),
          email: p.email || "",
          fullName: (p as Profile).fullName || "",
        } as Profile;

        let emailPayload: { subject: string; html: string } | null = null;
        if (templateFn) {
          if (templateKey === "profileCompletionReminder") {
            emailPayload = templateFn(
              baseProfile,
              p.isProfileComplete ? 100 : 70,
              ""
            );
          } else if (templateKey === "premiumPromo") {
            const promoDays =
              Array.isArray(params?.args) &&
              typeof params!.args![0] === "number"
                ? (params!.args![0] as number)
                : 30;
            emailPayload = templateFn(baseProfile, promoDays, "");
          } else if (templateKey === "recommendedProfiles") {
            // Optional: enrichment omitted in live send for safety; can be added behind a smaller cap
            emailPayload = templateFn(baseProfile, [], "");
          } else {
            emailPayload = templateFn(
              baseProfile,
              ...((params?.args || []) as unknown[]),
              ""
            );
          }
        } else {
          emailPayload = {
            subject: subject || "(no subject)",
            html: customBody || "",
          };
        }
        if (p.email) {
          await sendUserNotification(
            p.email,
            emailPayload.subject,
            emailPayload.html
          );
          sent += 1;
        }
      } catch {
        devLog("warn", "admin.marketing-email", "send_error", {
          email: p.email,
        });
      }
    }

    return successResponse({
      dryRun: false,
      attempted: profiles.length,
      sent,
      maxAudience: effectiveMax,
      actorId: userId,
    });
  } catch (error) {
    devLog("error", "admin.marketing-email", "unhandled_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Unexpected error", 500);
  }
}
