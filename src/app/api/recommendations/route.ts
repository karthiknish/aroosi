import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";

export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Subscription-based rate limiting
    if (!userId) {
      return errorResponse("User ID is required", 400);
    }

    const subscriptionRateLimit =
      await subscriptionRateLimiter.checkSubscriptionRateLimit(
        request,
        token,
        userId,
        "recommendations_requested"
      );

    if (!subscriptionRateLimit.allowed) {
      return errorResponse(
        subscriptionRateLimit.error || "Subscription limit exceeded",
        429
      );
    }

    const convexClient = getConvexClient();
    if (!convexClient)
      return errorResponse("Convex client not configured", 500);

    convexClient.setAuth(token);

    // Get user's profile to understand their preferences
    const userProfile = await convexClient.query(
      api.profiles.getProfileByUserId,
      {
        userId: userId as Id<"users">,
      }
    );

    if (!userProfile) {
      return errorResponse("User profile not found", 404);
    }

    // Extract user preferences for matching
    const userPreferences = {
      preferredGender: userProfile.preferredGender,
      ageMin: userProfile.partnerPreferenceAgeMin,
      ageMax: userProfile.partnerPreferenceAgeMax,
      cities: userProfile.partnerPreferenceCity,
      country: userProfile.country,
      religion: userProfile.religion,
      ethnicity: userProfile.ethnicity,
      education: userProfile.education,
      occupation: userProfile.occupation,
    };

    // Get potential matches based on preferences
    const recommendations = await convexClient.query(
      api.users.getRecommendedProfiles,
      {
        preferences: userPreferences,
        currentUserId: userId as string,
        limit: 10,
      }
    );

    // Calculate compatibility score for each profile
    const recommendedProfiles = recommendations.map((profile: any) => {
      let compatibilityScore = 0;
      let maxScore = 0;

      // Gender preference match
      if (
        userPreferences.preferredGender &&
        profile.gender === userPreferences.preferredGender
      ) {
        compatibilityScore += 15;
      }
      maxScore += 15;

      // Age range match
      if (userPreferences.ageMin && profile.age >= userPreferences.ageMin) {
        compatibilityScore += 10;
      }
      if (userPreferences.ageMax && profile.age <= userPreferences.ageMax) {
        compatibilityScore += 10;
      }
      maxScore += 20;

      // Location match (city)
      if (userPreferences.cities && Array.isArray(userPreferences.cities)) {
        if (
          userPreferences.cities.some((city) =>
            profile.city?.toLowerCase().includes(city.toLowerCase())
          )
        ) {
          compatibilityScore += 15;
        }
      } else if (
        userPreferences.cities &&
        profile.city
          ?.toLowerCase()
          .includes(userPreferences.cities.toLowerCase())
      ) {
        compatibilityScore += 15;
      }
      maxScore += 15;

      // Country match
      if (
        userPreferences.country &&
        profile.country === userPreferences.country
      ) {
        compatibilityScore += 10;
      }
      maxScore += 10;

      // Religion match
      if (
        userPreferences.religion &&
        profile.religion === userPreferences.religion
      ) {
        compatibilityScore += 15;
      }
      maxScore += 15;

      // Ethnicity match
      if (
        userPreferences.ethnicity &&
        profile.ethnicity === userPreferences.ethnicity
      ) {
        compatibilityScore += 10;
      }
      maxScore += 10;

      // Education match
      if (
        userPreferences.education &&
        profile.education === userPreferences.education
      ) {
        compatibilityScore += 10;
      }
      maxScore += 10;

      // Occupation match
      if (
        userPreferences.occupation &&
        profile.occupation === userPreferences.occupation
      ) {
        compatibilityScore += 5;
      }
      maxScore += 5;

      // Calculate percentage
      const finalScore = Math.round((compatibilityScore / maxScore) * 100);

      return {
        id: profile._id,
        fullName: profile.fullName,
        city: profile.city,
        country: profile.country,
        profileImageUrl:
          profile.profileImageUrls?.[0] || "/images/default-avatar.png",
        compatibilityScore: finalScore,
        aboutMe: profile.aboutMe || "No bio available",
      };
    });

    // Sort by compatibility score
    recommendedProfiles.sort(
      (a: any, b: any) => b.compatibilityScore - a.compatibilityScore
    );

    return successResponse({
      recommendations: recommendedProfiles,
      count: recommendedProfiles.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in recommendations API route:", error);

    const errorMessage =
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : "Unknown error"
        : "Recommendations service temporarily unavailable";

    return errorResponse(errorMessage, 500);
  }
}
