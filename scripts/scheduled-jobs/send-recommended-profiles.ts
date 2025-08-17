#!/usr/bin/env node
import { sendUserNotification } from "../../src/lib/email";
import type { Profile } from "../../src/types/profile";
import { listProfiles } from "../../src/lib/admin/firestoreAdminProfiles";

// Simple fallback template (original marketing templates removed during Convex purge)
function recommendedProfilesTemplate(
  user: Partial<Profile>,
  recs: any[],
  baseUrl: string
) {
  const subject = `Your recommended profiles (${recs.length})`;
  const items = recs
    .slice(0, 5)
    .map(
      (r) =>
        `<li><strong>${r.fullName || r.displayName || "Member"}</strong>${r.city ? " - " + r.city : ""}</li>`
    )
    .join("");
  const html = `<p>Hi ${user.fullName || "there"},</p><p>Here are a few profiles you might like:</p><ul>${items}</ul><p>Visit <a href="${baseUrl || "https://app.aroosi.app"}">Aroosi</a> to view more.</p>`;
  return { subject, html };
}

/**
 * Script to send recommended profiles email to all users
 * This should be run as a scheduled job (e.g., daily or weekly)
 */

async function sendRecommendedProfilesEmails() {
  console.log("Starting recommended profiles email job...");

  try {
    // Fetch profiles in pages using Firestore admin helper
    const profiles: Array<{
      email?: string;
      fullName?: string;
      aboutMe?: string;
      profileImageUrls?: string[];
      images?: string[];
      interests?: string[] | string;
      isProfileComplete?: boolean;
    }> = [];
    const pageSize = 200;
    let page = 1;
    while (true) {
      const { profiles: p } = await listProfiles({
        search: undefined,
        page,
        pageSize,
        sortBy: "createdAt",
        sortDir: "desc",
        banned: "all",
        plan: "all",
        isProfileComplete: "all",
      });
      profiles.push(...p);
      if (p.length < pageSize) break;
      page += 1;
      if (page > 50) break; // safety cap
    }

    console.log(`Processing ${profiles.length} profiles...`);

    // For each profile, fetch their recommendations and send email
    for (const p of profiles) {
      if (!p.email) {
        console.log(`Skipping profile without email: ${p.fullName}`);
        continue;
      }

      try {
        // Fetch recommended profiles for this user
        const recommendationsResponse = await fetch(
          process.env.RECOMMENDATIONS_ENDPOINT ||
            "http://localhost:3000/api/recommendations",
          { headers: { "Content-Type": "application/json" } }
        );

        if (!recommendationsResponse.ok) {
          console.error(
            `Failed to fetch recommendations for ${p.email}: ${recommendationsResponse.statusText}`
          );
          continue;
        }

        const recommendationsData = await recommendationsResponse.json();

        // Only send email if there are recommendations
        if (
          recommendationsData.recommendations &&
          recommendationsData.recommendations.length > 0
        ) {
          const emailPayload = recommendedProfilesTemplate(
            p as Profile,
            recommendationsData.recommendations,
            process.env.APP_PUBLIC_URL || ""
          );

          await sendUserNotification(
            p.email,
            emailPayload.subject,
            emailPayload.html
          );

          console.log(`Sent recommended profiles email to ${p.email}`);
        } else {
          console.log(`No recommendations for ${p.email}, skipping email`);
        }
      } catch (err) {
        console.error(
          `Failed to send recommended profiles email to ${p.email}:`,
          err
        );
      }
    }

    console.log("Recommended profiles email job completed successfully");
  } catch (error) {
    console.error("Error in recommended profiles email job:", error);
    process.exit(1);
  }
}

// Run the script
sendRecommendedProfilesEmails().catch((err) => {
  console.error("Unhandled error in script:", err);
  process.exit(1);
});
