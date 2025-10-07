import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  CulturalProfile,
  CulturalMatchRecommendation,
  RecommendationsResponse
} from "@/types/cultural";

function calculateCulturalMatchScore(userProfile: CulturalProfile, candidateProfile: CulturalProfile): number {
  let score = 0;
  let totalWeight = 0;

  // Religion compatibility (40% weight)
  if (userProfile.religion && candidateProfile.religion) {
    if (userProfile.religion === candidateProfile.religion) {
      score += 40;
      if (userProfile.religiousPractice === candidateProfile.religiousPractice) {
        score += 10; // Bonus for matching practice
      }
    } else {
      // Different religions - reduce score based on importance
      const avgImportance = (userProfile.importanceOfReligion + candidateProfile.importanceOfReligion) / 2;
      score += Math.max(0, 40 - (avgImportance * 3));
    }
  }
  totalWeight += 50; // 40 + 10 bonus

  // Language compatibility (20% weight)
  if (userProfile.languages.length > 0 && candidateProfile.languages.length > 0) {
    const sharedLanguages = userProfile.languages.filter(lang =>
      candidateProfile.languages.includes(lang)
    ).length;

    if (sharedLanguages > 0) {
      score += 20;
    } else if (userProfile.motherTongue === candidateProfile.motherTongue) {
      score += 15;
    }
  }
  totalWeight += 20;

  // Cultural values compatibility (25% weight)
  let culturalScore = 0;
  if (userProfile.familyValues === candidateProfile.familyValues) culturalScore += 8;
  if (userProfile.marriageViews === candidateProfile.marriageViews) culturalScore += 8;
  if (userProfile.traditionalValues === candidateProfile.traditionalValues) culturalScore += 9;

  score += culturalScore;
  totalWeight += 25;

  // Family compatibility (15% weight) - basic scoring
  if (userProfile.familyBackground && candidateProfile.familyBackground) {
    score += 15;
  } else {
    score += 7.5; // Partial score for having some family info
  }
  totalWeight += 15;

  // Normalize to 0-100 scale
  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

function getMatchingFactors(userProfile: CulturalProfile, candidateProfile: CulturalProfile): string[] {
  const factors: string[] = [];

  if (userProfile.religion === candidateProfile.religion) {
    factors.push("Same religion");
    if (userProfile.religiousPractice === candidateProfile.religiousPractice) {
      factors.push("Same religious practice");
    }
  }

  const sharedLanguages = userProfile.languages.filter(lang =>
    candidateProfile.languages.includes(lang)
  );
  if (sharedLanguages.length > 0) {
    factors.push(`Shared languages: ${sharedLanguages.join(", ")}`);
  }

  if (userProfile.motherTongue === candidateProfile.motherTongue) {
    factors.push("Same mother tongue");
  }

  if (userProfile.familyValues === candidateProfile.familyValues) {
    factors.push("Matching family values");
  }

  if (userProfile.marriageViews === candidateProfile.marriageViews) {
    factors.push("Aligned marriage views");
  }

  return factors;
}

function getCulturalHighlights(profile: CulturalProfile): string[] {
  const highlights: string[] = [];

  if (profile.religion) {
    highlights.push(`${profile.religion} faith`);
  }

  if (profile.languages.length > 0) {
    highlights.push(`Speaks ${profile.languages.join(", ")}`);
  }

  if (profile.familyValues) {
    highlights.push(`${profile.familyValues} family values`);
  }

  if (profile.marriageViews) {
    highlights.push(`Prefers ${profile.marriageViews.replace("_", " ")}`);
  }

  return highlights;
}

// GET /api/cultural/recommendations - Get cultural match recommendations
export const GET = withFirebaseAuth(async (req: NextRequest) => {
  // Rate limiting
  const rateLimitResult = await checkApiRateLimit(req);
  if (rateLimitResult) return rateLimitResult;

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "User not authenticated" },
      { status: 401 }
    );
  }

  try {
    // Get user's cultural profile
    const userProfileDoc = await db.collection("culturalProfiles").doc(userId).get();
    if (!userProfileDoc.exists) {
      return NextResponse.json(
        { success: false, error: "User cultural profile not found. Please complete your cultural profile first." },
        { status: 404 }
      );
    }

    const userProfile = { _id: userProfileDoc.id, ...userProfileDoc.data() } as CulturalProfile;

    // Get all other cultural profiles
    const profilesSnapshot = await db.collection("culturalProfiles").get();
    const candidateProfiles: CulturalProfile[] = [];

    profilesSnapshot.forEach((doc) => {
      const profile = { _id: doc.id, ...doc.data() } as CulturalProfile;
      if (profile.userId !== userId) { // Exclude user's own profile
        candidateProfiles.push(profile);
      }
    });

    // Calculate compatibility scores and create recommendations
    const recommendations: CulturalMatchRecommendation[] = candidateProfiles
      .map(candidateProfile => {
        const compatibilityScore = calculateCulturalMatchScore(userProfile, candidateProfile);

        // Get basic profile info for the candidate
        // In a real implementation, you'd join with the profiles collection
        const profile = {
          _id: candidateProfile.userId,
          fullName: "User", // This would come from the profiles collection
          age: 25, // This would be calculated from dateOfBirth
          city: "City", // This would come from profiles
        };

        return {
          userId: candidateProfile.userId,
          compatibilityScore,
          matchingFactors: getMatchingFactors(userProfile, candidateProfile),
          culturalHighlights: getCulturalHighlights(candidateProfile),
          profile
        };
      })
      .filter(rec => rec.compatibilityScore >= 40) // Only show reasonably compatible matches
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore) // Sort by compatibility score
      .slice(0, 20); // Limit to top 20 recommendations

    return NextResponse.json({
      success: true,
      recommendations
    } as RecommendationsResponse);
  } catch (error) {
    console.error("Error fetching cultural recommendations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
});
