import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { Notifications } from "@/lib/notify";
import {
  validateProfileData,
  sanitizeProfileInput,
} from "@/lib/utils/profileValidation";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { getConvexClient } from "@/lib/convexClient";

function isProfileWithEmail(
  profile: unknown,
): profile is import("@/types/profile").Profile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    typeof (profile as { email?: unknown }).email === "string"
  );
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);
    const rateLimitResult = checkApiRateLimit(
      `profile_get_${userId}`,
      50,
      60000,
    );
    if (!rateLimitResult.allowed)
      return errorResponse("Rate limit exceeded", 429);
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);
    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (!profile) return errorResponse("User profile not found", 404);
    return successResponse({ profile });
  } catch (error) {
    console.error("Error in GET /api/profile route:", error);
    return errorResponse("Failed to process profile request", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);
    const rateLimitResult = checkApiRateLimit(
      `profile_update_${userId}`,
      20,
      60000,
    );
    if (!rateLimitResult.allowed)
      return errorResponse("Rate limit exceeded", 429);
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object")
      return errorResponse("Missing or invalid body", 400);
    const sanitizedBody = sanitizeProfileInput(body);
    const ALLOWED_UPDATE_FIELDS = [
      "fullName",
      "dateOfBirth",
      "gender",
      "city",
      "country",
      "aboutMe",
      "religion",
      "motherTongue",
      "ethnicity",
      "occupation",
      "education",
      "height",
      "maritalStatus",
      "smoking",
      "drinking",
      "diet",
      "physicalStatus",
      "profileImageIds",
      "isProfileComplete",
      "phoneNumber",
      "annualIncome",
      "partnerPreferenceAgeMin",
      "partnerPreferenceAgeMax",
      "partnerPreferenceCity",
      "preferredGender",
      "profileFor",
      "hideFromFreeUsers",
      "subscriptionPlan",
      "subscriptionExpiresAt",
    ] as const;
    const adminOnlyFields = ["subscriptionPlan", "subscriptionExpiresAt"];
    const hasAdminFields = adminOnlyFields.some(
      (field) => field in sanitizedBody,
    );
    if (hasAdminFields) {
      adminOnlyFields.forEach((field) => delete sanitizedBody[field]);
    }
    const updates = Object.fromEntries(
      Object.entries(sanitizedBody).filter(([key]) =>
        (ALLOWED_UPDATE_FIELDS as readonly string[]).includes(key),
      ),
    ) as Record<string, unknown>;
    if (Object.keys(updates).length === 0)
      return errorResponse("No valid profile fields provided.", 400);
    const validation = validateProfileData(updates);
    if (!validation.isValid)
      return errorResponse(validation.error || "Invalid profile data", 400);
    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (!profile) return errorResponse("User profile not found", 404);
    // Only allow updating own profile
    if (profile.userId !== userId) return errorResponse("Unauthorized", 403);
    await convex.mutation(api.users.updateProfile, { updates });
    // Fetch updated profile
    const updatedProfile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (isProfileWithEmail(updatedProfile)) {
      try {
        await Notifications.profileCreated(
          updatedProfile.email,
          updatedProfile,
        );
        await Notifications.profileCreatedAdmin(updatedProfile);
      } catch (e) {
        console.error("Failed to send welcome or admin email", e);
      }
    }
    return successResponse({
      profile: updatedProfile,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error in profile update API route:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);
    const rateLimitResult = checkApiRateLimit(
      `profile_create_${userId}`,
      3,
      60000,
    );
    if (!rateLimitResult.allowed)
      return errorResponse("Rate limit exceeded", 429);
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object")
      return errorResponse("Missing or invalid body", 400);
    const sanitizedBody = sanitizeProfileInput(body);
    const requiredFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "preferredGender",
      "city",
      "aboutMe",
      "occupation",
      "education",
      "height",
      "maritalStatus",
      "phoneNumber",
    ];
    for (const field of requiredFields) {
      if (!sanitizedBody[field] || typeof sanitizedBody[field] !== "string") {
        return errorResponse(
          `Missing or invalid required field: ${field}`,
          400,
        );
      }
    }
    const validation = validateProfileData(sanitizedBody);
    if (!validation.isValid)
      return errorResponse(validation.error || "Invalid profile data", 400);
    // Check if user already has a profile
    const existingProfile = await convex.query(
      api.profiles.getProfileByUserId,
      { userId: userId as Id<"users"> },
    );
    if (existingProfile) return errorResponse("Profile already exists", 409);
    // Format the data for createProfile mutation
    const profileData = { ...sanitizedBody, userId: userId as Id<"users"> };
    // @ts-expect-error - Type mismatch needs refactoring
    await convex.mutation(api.users.createProfile, profileData);
    // Fetch the latest profile
    const newProfile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (isProfileWithEmail(newProfile)) {
      try {
        await Notifications.profileCreated(newProfile.email, newProfile);
        await Notifications.profileCreatedAdmin(newProfile);
      } catch (e) {
        console.error("Failed to send welcome or admin email", e);
      }
    }
    return successResponse({
      profile: newProfile,
      message: "Profile created successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/profile:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;
    if (!userId) return errorResponse("User ID not found in token", 401);
    const rateLimitResult = checkApiRateLimit(
      `profile_delete_${userId}`,
      1,
      60000,
    );
    if (!rateLimitResult.allowed)
      return errorResponse("Rate limit exceeded", 429);
    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);
    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: userId as Id<"users">,
    });
    if (!profile || !profile._id)
      return errorResponse("No user or profile found for deletion", 404);
    if (profile.userId !== userId) return errorResponse("Unauthorized", 403);
    await convex.mutation(api.users.deleteProfile, { id: profile._id });
    return successResponse({
      message: "User and profile deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/profile:", error);
    return errorResponse("Failed to delete user and profile", 500);
  }
}
