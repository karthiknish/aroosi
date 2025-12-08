import React from "react";
import { render as renderEmail } from "@react-email/render";
import { Profile } from "@/types/profile";
import { ProfileCompletionReminder } from "@/emails/Marketing/ProfileCompletionReminder";
import { RecommendedProfiles } from "@/emails/Marketing/RecommendedProfiles";

export type RenderResult = { subject: string; html: string };

export function renderMarketingReactTemplate(
  templateKey: string,
  args: any,
  context: { profile: Profile; unsubscribeToken: string }
): RenderResult | null {
  const { profile, unsubscribeToken } = context;
  switch (templateKey) {
    case "profileCompletionReminder": {
      const completionPercentage = Number(args?.completionPercentage ?? 0);
      const element = (
        <ProfileCompletionReminder
          name={profile.fullName || "there"}
          completionPercentage={completionPercentage}
          unsubscribeToken={unsubscribeToken}
        />
      );
      const html = renderEmail(element);
      const subject = `${profile.fullName}, your profile is ${completionPercentage}% complete`;
      return { subject, html };
    }
    case "recommendedProfiles": {
      const recs = Array.isArray(args?.recommendations)
        ? args.recommendations
        : [];
      const element = (
        <RecommendedProfiles
          name={profile.fullName || "there"}
          recommendations={recs}
          unsubscribeToken={unsubscribeToken}
        />
      );
      const html = renderEmail(element);
      const subject = `New matches for you on Aroosi – ${recs.length} recommended profiles`;
      return { subject, html };
    }
    default:
      return null;
  }
}
