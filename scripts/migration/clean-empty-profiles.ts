#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
 
 
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { api } from "../../convex/_generated/api";

/*
  Clean Empty Profiles Script
  ---------------------------
  This utility scans the destination Convex instance and deletes any profile
  that has no meaningful data (all optional fields are empty / undefined and
  the profile is marked incomplete).

  Usage:
    1. Ensure you have DEST_CONVEX_TOKEN in your root .env.local
    2. yarn ts-node scripts/migration/clean-empty-profiles.ts

  NOTE: The DEST_CONVEX_TOKEN must belong to a user with admin privileges
  because it will invoke the `users.deleteProfile` admin mutation.
*/

// Resolve paths so we can load env vars from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..", "..");
const envPath = path.join(rootDir, ".env.local");
// Load env vars
dotenv.config({ path: envPath });

// Configuration – adjust if you ever point to a different prod instance
const DESTINATION_URL = "https://proper-gull-501.convex.cloud";
// Token no longer required because server-side auth checks are disabled

// Convex client for prod
const client = new ConvexHttpClient(DESTINATION_URL);
// No authentication header

// Typings for a subset of the profile document (we only need a few fields)
interface ProfileMinimal {
  _id: string;
  _creationTime: number;
  userId: string;
  clerkId: string;
  isProfileComplete?: boolean;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  preferredGender?: string;
  city?: string;
  country?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  aboutMe?: string;
  profileImageIds?: string[];
  profileImageUrls?: string[];
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function isProfileEmpty(profile: ProfileMinimal): boolean {
  const fieldsToInspect: (keyof ProfileMinimal)[] = [
    "fullName",
    "dateOfBirth",
    "gender",
    "preferredGender",
    "city",
    "country",
    "height",
    "maritalStatus",
    "education",
    "occupation",
    "aboutMe",
  ];

  const coreFieldsEmpty = fieldsToInspect.every((field) =>
    isEmptyValue(profile[field])
  );

  const imagesEmpty =
    (!profile.profileImageIds || profile.profileImageIds.length === 0) &&
    (!profile.profileImageUrls || profile.profileImageUrls.length === 0);

  const markedIncomplete = profile.isProfileComplete === false || !profile.isProfileComplete;

  return coreFieldsEmpty && imagesEmpty && markedIncomplete;
}

async function fetchAllProfiles(): Promise<ProfileMinimal[]> {
  return (await client.query(api.migration.getAllProfiles)) as ProfileMinimal[];
}

async function deleteProfile(profileId: string): Promise<void> {
  await client.mutation(api.migration.deleteProfileForMigration, {
    id: profileId as any,
  });
}

async function main() {
  console.log("--- Cleaning empty profiles ---");
  console.log(`Destination: ${DESTINATION_URL}`);

  const profiles = await fetchAllProfiles();
  console.log(`Fetched ${profiles.length} profiles.`);

  const emptyProfiles = profiles.filter(isProfileEmpty);
  console.log(`Identified ${emptyProfiles.length} empty profiles to delete.`);

  let success = 0;
  let failure = 0;

  for (const p of emptyProfiles) {
    try {
      await deleteProfile(p._id);
      console.log(`Deleted profile ${p._id} (${p.clerkId})`);
      success++;
    } catch (err) {
      console.error(`Failed to delete profile ${p._id}:`, err);
      failure++;
    }
  }

  console.log("--- Clean-up complete ---");
  console.log(`Successfully deleted: ${success}`);
  console.log(`Failures: ${failure}`);
}

main().catch((err) => {
  console.error("Unexpected error while cleaning profiles:", err);
  process.exit(1);
}); 