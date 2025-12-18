import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import {
  CulturalProfile,
  CulturalMatchRecommendation,
} from "@/types/cultural";

function calculateCulturalMatchScore(userProfile: CulturalProfile, candidateProfile: CulturalProfile): number {
  let score = 0;
  let totalWeight = 0;

  if (userProfile.religion && candidateProfile.religion) {
    if (userProfile.religion === candidateProfile.religion) {
      score += 40;
      if (userProfile.religiousPractice === candidateProfile.religiousPractice) {
        score += 10;
      }
    } else {
      const avgImportance = (userProfile.importanceOfReligion + candidateProfile.importanceOfReligion) / 2;
      score += Math.max(0, 40 - (avgImportance * 3));
    }
  }
  totalWeight += 50;

  if (userProfile.languages.length > 0 && candidateProfile.languages.length > 0) {
    const sharedLanguages = userProfile.languages.filter(lang => candidateProfile.languages.includes(lang)).length;
    if (sharedLanguages > 0) score += 20;
    else if (userProfile.motherTongue === candidateProfile.motherTongue) score += 15;
  }
  totalWeight += 20;

  let culturalScore = 0;
  if (userProfile.familyValues === candidateProfile.familyValues) culturalScore += 8;
  if (userProfile.marriageViews === candidateProfile.marriageViews) culturalScore += 8;
  if (userProfile.traditionalValues === candidateProfile.traditionalValues) culturalScore += 9;
  score += culturalScore;
  totalWeight += 25;

  if (userProfile.familyBackground && candidateProfile.familyBackground) score += 15;
  else score += 7.5;
  totalWeight += 15;

  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

function getMatchingFactors(userProfile: CulturalProfile, candidateProfile: CulturalProfile): string[] {
  const factors: string[] = [];
  if (userProfile.religion === candidateProfile.religion) {
    factors.push("Same religion");
    if (userProfile.religiousPractice === candidateProfile.religiousPractice) factors.push("Same religious practice");
  }
  const sharedLanguages = userProfile.languages.filter(lang => candidateProfile.languages.includes(lang));
  if (sharedLanguages.length > 0) factors.push(`Shared languages: ${sharedLanguages.join(", ")}`);
  if (userProfile.motherTongue === candidateProfile.motherTongue) factors.push("Same mother tongue");
  if (userProfile.familyValues === candidateProfile.familyValues) factors.push("Matching family values");
  if (userProfile.marriageViews === candidateProfile.marriageViews) factors.push("Aligned marriage views");
  return factors;
}

function getCulturalHighlights(profile: CulturalProfile): string[] {
  const highlights: string[] = [];
  if (profile.religion) highlights.push(`${profile.religion} faith`);
  if (profile.languages.length > 0) highlights.push(`Speaks ${profile.languages.join(", ")}`);
  if (profile.familyValues) highlights.push(`${profile.familyValues} family values`);
  if (profile.marriageViews) highlights.push(`Prefers ${profile.marriageViews.replace("_", " ")}`);
  return highlights;
}

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;

    try {
      const userProfileDoc = await db.collection("culturalProfiles").doc(userId).get();
      if (!userProfileDoc.exists) {
        return errorResponse("User cultural profile not found. Please complete your cultural profile first.", 404, { correlationId: ctx.correlationId });
      }

      const userProfile = { _id: userProfileDoc.id, ...userProfileDoc.data() } as CulturalProfile;
      const profilesSnapshot = await db.collection("culturalProfiles").get();
      const candidateProfiles: CulturalProfile[] = [];

      profilesSnapshot.forEach((doc: any) => {
        const profile = { _id: doc.id, ...doc.data() } as CulturalProfile;
        if (profile.userId !== userId) candidateProfiles.push(profile);
      });

      const recommendations: CulturalMatchRecommendation[] = candidateProfiles
        .map(candidateProfile => {
          const compatibilityScore = calculateCulturalMatchScore(userProfile, candidateProfile);
          const profile = {
            _id: candidateProfile.userId,
            fullName: "User",
            age: 25,
            city: "City",
          };
          return {
            userId: candidateProfile.userId,
            compatibilityScore,
            matchingFactors: getMatchingFactors(userProfile, candidateProfile),
            culturalHighlights: getCulturalHighlights(candidateProfile),
            profile
          };
        })
        .filter(rec => rec.compatibilityScore >= 40)
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, 20);

      return successResponse({ recommendations }, 200, ctx.correlationId);
    } catch (error) {
      console.error("cultural/recommendations error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch recommendations", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "cultural_recommendations", maxRequests: 100 }
  }
);
