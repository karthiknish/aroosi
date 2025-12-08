import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import {
  successResponse,
  errorResponse,
  errorResponsePublic,
} from "@/lib/apiResponse";
import {
  welcomeDay1Template,
  profileCompletionReminderTemplate,
  weeklyMatchesDigestTemplate,
  reEngagementTemplate,
  premiumPromoTemplate,
  successStoryTemplate,
  recommendedProfilesTemplate,
} from "@/lib/marketingEmailTemplates";
import type { Profile } from "@/types/profile";

type PreviewBody = {
  templateKey?: string;
  params?: { args?: unknown[] };
  preheader?: string;
  subject?: string; // custom mode
  body?: string; // custom HTML mode
};

function stubProfile(): Profile {
  return {
    _id: "preview_user",
    fullName: "Aroosi Friend",
    email: "friend@example.com",
    city: "Kabul",
    country: "Afghanistan",
  } as any;
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    let body: PreviewBody;
    try {
      body = (await request.json()) as PreviewBody;
    } catch {
      return errorResponsePublic("Invalid JSON body", 400);
    }

    const {
      templateKey,
      params,
      preheader,
      subject,
      body: customHtml,
    } = body || {};

    // Custom mode: return provided subject/body with preheader inserted at top
    if (!templateKey && subject && typeof customHtml === "string") {
      const pre =
        preheader && preheader.trim()
          ? `<div style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent">${preheader.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`
          : "";
      const html = `${pre}${customHtml}`;
      return successResponse({ subject, html });
    }

    if (!templateKey)
      return errorResponsePublic(
        "Missing templateKey or custom subject/body",
        400
      );

    const profile = stubProfile();
    const unsub = "test_unsub_token";
    const args = (params?.args as unknown[]) || [];
    let payload: { subject: string; html: string } | null = null;

    switch (templateKey) {
      case "welcomeDay1":
        payload = welcomeDay1Template(profile, unsub, preheader);
        break;
      case "profileCompletionReminder": {
        const pct = Number(args[0] ?? 70);
        payload = profileCompletionReminderTemplate(
          profile,
          pct,
          unsub,
          preheader
        );
        break;
      }
      case "weeklyDigest": {
        const count = Number(args[0] ?? 8);
        payload = weeklyMatchesDigestTemplate(profile, count, unsub, preheader);
        break;
      }
      case "reEngagement": {
        const days = Number(args[0] ?? 14);
        payload = reEngagementTemplate(profile, days, unsub, preheader);
        break;
      }
      case "premiumPromo": {
        const discount = Number(args[0] ?? 30);
        payload = premiumPromoTemplate(profile, discount, unsub, preheader);
        break;
      }
      case "successStory": {
        const title = String(args[0] ?? "A Beautiful Beginning");
        const preview = String(
          args[1] ?? "Two hearts found each other on Aroosi."
        );
        payload = successStoryTemplate(title, preview, unsub, preheader);
        break;
      }
      case "recommendedProfiles": {
        const recs = [
          {
            id: "p1",
            fullName: "Mina",
            city: "Herat",
            country: "Afghanistan",
            profileImageUrl: "/placeholder.jpg",
            compatibilityScore: 92,
            aboutMe: "I love poetry and mountains.",
          },
          {
            id: "p2",
            fullName: "Ahmad",
            city: "Kabul",
            country: "Afghanistan",
            profileImageUrl: "/placeholder.jpg",
            compatibilityScore: 88,
            aboutMe: "Coffee, books, and long walks.",
          },
        ];
        payload = recommendedProfilesTemplate(profile, recs, unsub, preheader);
        break;
      }
      default:
        return errorResponsePublic("Unknown templateKey", 400);
    }

    if (!payload) return errorResponse("Failed to render template", 500);
    return successResponse(payload);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[marketing-email/preview] Unexpected error", e);
    }
    return errorResponse("Preview failed", 500);
  }
}


