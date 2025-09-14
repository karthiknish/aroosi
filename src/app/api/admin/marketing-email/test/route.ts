import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import {
  profileCompletionReminderTemplate,
  premiumPromoTemplate,
  recommendedProfilesTemplate,
  reEngagementTemplate,
  successStoryTemplate,
  weeklyMatchesDigestTemplate,
  welcomeDay1Template,
} from "@/lib/marketingEmailTemplates";
import type { Profile } from "@/types/profile";
import { sendUserNotification } from "@/lib/email";

type TestBody = {
  testEmail: string;
  templateKey?: string;
  params?: { args?: unknown[] };
  preheader?: string;
  subject?: string; // custom mode
  body?: string; // custom HTML body
  abTest?: { subjects: [string, string]; ratio?: number };
};

function stubProfile(): Profile {
  return {
    _id: "test_user",
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
    let body: TestBody;
    try {
      body = (await request.json()) as TestBody;
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { testEmail, templateKey, params, preheader, subject, body: customHtml } = body || {};
    if (!testEmail || !testEmail.includes("@")) {
      return errorResponse("Invalid testEmail", 400);
    }

    // Custom mode: subject + html provided
    if (!templateKey && subject && typeof customHtml === "string") {
      let html = customHtml;
      if (preheader && preheader.trim()) {
        const pre = `<div style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent">${preheader
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</div>`;
        const bodyOpen = html.match(/<body[^>]*>/i);
        if (bodyOpen && bodyOpen.index != null) {
          const idx = (bodyOpen.index as number) + bodyOpen[0].length;
          html = html.slice(0, idx) + pre + html.slice(idx);
        } else {
          html = pre + html;
        }
      }
      await sendUserNotification(testEmail, subject, html);
      return successResponse({ sent: true, recipient: testEmail, subject });
    }

    if (!templateKey) return errorResponse("Missing templateKey or custom subject/body", 400);

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
        payload = profileCompletionReminderTemplate(profile, pct, unsub, preheader);
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
        const preview = String(args[1] ?? "Two hearts found each other on Aroosi.");
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
            profileImageUrl: "https://aroosi.app/images/placeholder.png",
            compatibilityScore: 92,
            aboutMe: "I love poetry and mountains.",
          },
          {
            id: "p2",
            fullName: "Ahmad",
            city: "Kabul",
            country: "Afghanistan",
            profileImageUrl: "https://aroosi.app/images/placeholder.png",
            compatibilityScore: 88,
            aboutMe: "Coffee, books, and long walks.",
          },
        ];
        payload = recommendedProfilesTemplate(profile, recs, unsub, preheader);
        break;
      }
      default:
        return errorResponse("Unknown templateKey", 400);
    }

    if (!payload) return errorResponse("Failed to render template", 500);
    await sendUserNotification(testEmail, payload.subject, payload.html);
    return successResponse({ sent: true, recipient: testEmail, subject: payload.subject });
  } catch (e) {
    return errorResponse("Failed to send test email", 500);
  }
}
