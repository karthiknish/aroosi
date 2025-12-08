import "server-only";
import React from "react";
import ReactDOMServer from "react-dom/server";
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
      const element = React.createElement(ProfileCompletionReminder, {
        name: profile.fullName || "there",
        completionPercentage,
        unsubscribeToken,
      });
      const html = ReactDOMServer.renderToStaticMarkup(element);
      const subject = `${profile.fullName}, your profile is ${completionPercentage}% complete`;
      return { subject, html };
    }
    case "recommendedProfiles": {
      const recs = Array.isArray(args?.recommendations)
        ? args.recommendations
        : [];
      const element = React.createElement(RecommendedProfiles, {
        name: profile.fullName || "there",
        recommendations: recs,
        unsubscribeToken,
      });
      const html = ReactDOMServer.renderToStaticMarkup(element);
      const subject = `New matches for you on Aroosi – ${recs.length} recommended profiles`;
      return { subject, html };
    }
    default:
      return null;
  }
}
