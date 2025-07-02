import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../../convex/_generated/api";

// Load environment variables
dotenv.config();

// Configuration
const SOURCE_URL = "https://quirky-akita-969.convex.cloud";
const DESTINATION_URL = "https://proper-gull-501.convex.cloud";

// Get tokens from environment variables
const SOURCE_TOKEN = process.env.SOURCE_CONVEX_TOKEN;
const DEST_TOKEN = process.env.DEST_CONVEX_TOKEN;

if (!SOURCE_TOKEN || !DEST_TOKEN) {
  console.error(
    "Error: Missing authentication tokens in environment variables",
  );
  console.error(
    "Please set SOURCE_CONVEX_TOKEN and DEST_CONVEX_TOKEN in your .env file",
  );
  process.exit(1);
}

// Initialize Convex clients
const sourceClient = new ConvexHttpClient(SOURCE_URL);
sourceClient.setAuth(SOURCE_TOKEN);

const destClient = new ConvexHttpClient(DESTINATION_URL);
destClient.setAuth(DEST_TOKEN);

interface Profile {
  _id: string;
  _creationTime: number;
  userId: string;
  clerkId: string;
  profileFor?: string;
  isProfileComplete?: boolean;
  isOnboardingComplete?: boolean;
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
  annualIncome?: number;
  aboutMe?: string;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
  phoneNumber?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  partnerPreferenceAgeMin?: number | string;
  partnerPreferenceAgeMax?: number | string;
  partnerPreferenceReligion?: string[];
  partnerPreferenceCity?: string[];
  profileImageIds?: string[];
  profileImageUrls?: string[];
  banned?: boolean;
  email?: string;
  createdAt: number;
  updatedAt?: number;
  boostsRemaining?: number;
  boostedUntil?: number;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: number;
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
  boostsMonth?: number;
  hideFromFreeUsers?: boolean;
  biometricSettings?: any;
  biometricDevices?: any[];
}

interface User {
  _id: string;
  _creationTime: number;
  clerkId: string;
  email: string;
  banned?: boolean;
  role?: string;
}

interface Image {
  _id: string;
  _creationTime: number;
  userId: string;
  storageId: string;
  fileName: string;
  contentType?: string;
  fileSize?: number;
}

async function fetchAllProfiles(client: ConvexHttpClient): Promise<Profile[]> {
  try {
    console.log(
      "Fetching profiles from:",
      client === sourceClient ? SOURCE_URL : DESTINATION_URL,
    );

    const profiles = await client.query(api.migration.getAllProfiles);
    return profiles as Profile[];
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
}

async function fetchAllUsers(client: ConvexHttpClient): Promise<User[]> {
  try {
    console.log(
      "Fetching users from:",
      client === sourceClient ? SOURCE_URL : DESTINATION_URL,
    );

    const users = await client.query(api.migration.getAllUsers);
    return users as User[];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

async function fetchUserImages(
  client: ConvexHttpClient,
  userId: string,
): Promise<Image[]> {
  try {
    const images = await client.query(api.migration.getImagesByUserId, {
      userId: userId as any,
    });
    return images as Image[];
  } catch (error) {
    console.error("Error fetching images for user:", userId, error);
    return [];
  }
}

async function findMissingProfiles(): Promise<{
  missingProfiles: Profile[];
  missingUsers: User[];
}> {
  console.log("Fetching data from both instances...");

  const [sourceProfiles, destProfiles, sourceUsers, destUsers] =
    await Promise.all([
      fetchAllProfiles(sourceClient),
      fetchAllProfiles(destClient),
      fetchAllUsers(sourceClient),
      fetchAllUsers(destClient),
    ]);

  console.log(`Source profiles: ${sourceProfiles.length}`);
  console.log(`Destination profiles: ${destProfiles.length}`);
  console.log(`Source users: ${sourceUsers.length}`);
  console.log(`Destination users: ${destUsers.length}`);

  // Create a Set of clerkIds in destination for quick lookup
  const destClerkIds = new Set(destProfiles.map((p) => p.clerkId));
  const destUserClerkIds = new Set(destUsers.map((u) => u.clerkId));

  // Find profiles that exist in source but not in destination
  const missingProfiles = sourceProfiles.filter(
    (profile) => !destClerkIds.has(profile.clerkId),
  );
  const missingUsers = sourceUsers.filter(
    (user) => !destUserClerkIds.has(user.clerkId),
  );

  console.log(`Found ${missingProfiles.length} missing profiles`);
  console.log(`Found ${missingUsers.length} missing users`);

  return { missingProfiles, missingUsers };
}

async function migrateProfile(profile: Profile, user: User): Promise<boolean> {
  try {
    console.log(
      `Migrating profile for ${profile.fullName || profile.clerkId}...`,
    );

    // First, create the user if it doesn't exist
    const newUserId = await destClient.mutation(
      api.migration.createUserForMigration,
      {
        clerkId: user.clerkId,
        email: user.email,
        banned: user.banned,
        role: user.role,
      },
    );

    // Prepare profile data, removing fields that will be auto-generated
    const { _id, _creationTime, userId, ...profileData } = profile;

    // Then create the profile
    await destClient.mutation(api.migration.createProfileForMigration, {
      ...profileData,
      userId: newUserId,
      // Ensure all enum fields have valid values
      profileFor: profileData.profileFor as any,
      gender: profileData.gender as any,
      preferredGender: profileData.preferredGender as any,
      maritalStatus: profileData.maritalStatus as any,
      motherTongue: profileData.motherTongue as any,
      religion: profileData.religion as any,
      ethnicity: profileData.ethnicity as any,
      diet: profileData.diet as any,
      smoking: profileData.smoking as any,
      drinking: profileData.drinking as any,
      physicalStatus: profileData.physicalStatus as any,
      subscriptionPlan: profileData.subscriptionPlan as any,
      // Handle profileImageIds separately as they need to be migrated
      profileImageIds: undefined,
    });

    // Migrate associated images if any
    if (profile.profileImageIds && profile.profileImageIds.length > 0) {
      const images = await fetchUserImages(sourceClient, profile.userId);
      for (const image of images) {
        console.log(`  Migrating image: ${image.fileName}`);
        const { _id: imageId, userId: oldUserId, ...imageData } = image;
        await destClient.mutation(api.migration.createImageForMigration, {
          ...imageData,
          userId: newUserId,
        });
      }
    }

    return true;
  } catch (error) {
    console.error(`Error migrating profile ${profile.clerkId}:`, error);
    return false;
  }
}

async function main() {
  console.log("Starting profile migration...");
  console.log(`Source: ${SOURCE_URL}`);
  console.log(`Destination: ${DESTINATION_URL}`);
  console.log("---");

  try {
    // Find missing profiles
    const { missingProfiles, missingUsers } = await findMissingProfiles();

    if (missingProfiles.length === 0) {
      console.log("No missing profiles found. All profiles are in sync!");
      return;
    }

    // Create a map of users by clerkId for quick lookup
    const userMap = new Map(missingUsers.map((u) => [u.clerkId, u]));

    // Migrate each missing profile
    let successCount = 0;
    let failureCount = 0;

    for (const profile of missingProfiles) {
      const user = userMap.get(profile.clerkId);
      if (!user) {
        console.error(`User not found for profile ${profile.clerkId}`);
        failureCount++;
        continue;
      }

      const success = await migrateProfile(profile, user);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    console.log("---");
    console.log("Migration completed!");
    console.log(`Successfully migrated: ${successCount} profiles`);
    console.log(`Failed to migrate: ${failureCount} profiles`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);
