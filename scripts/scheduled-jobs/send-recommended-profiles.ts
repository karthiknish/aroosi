#!/usr/bin/env node
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { sendUserNotification } from "@/lib/email";
import { Profile } from "@/types/profile";
import { recommendedProfilesTemplate } from "@/lib/marketingEmailTemplates";

/**
 * Script to send recommended profiles email to all users
 * This should be run as a scheduled job (e.g., daily or weekly)
 */

async function sendRecommendedProfilesEmails() {
  console.log("Starting recommended profiles email job...");

  const convex = getConvexClient();
  if (!convex) {
    console.error("Failed to initialize Convex client");
    process.exit(1);
  }

  try {
    // Fetch all profiles (in production, you might want to paginate)
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
          "http://localhost:3000/api/recommendations",
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
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
            ""
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
