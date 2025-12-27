import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { NextRequest } from "next/server";
import type {
  CulturalProfile,
  CulturalCompatibilityScore,
} from "@aroosi/shared/types";

function calculateReligionCompatibility(profile1: CulturalProfile, profile2: CulturalProfile): { score: number; explanation: string } {
  if (!profile1.religion || !profile2.religion) {
    return { score: 50, explanation: "Religion information not available for comparison" };
  }

  if (profile1.religion === profile2.religion) {
    const practiceMatch = profile1.religiousPractice === profile2.religiousPractice;
    const score = practiceMatch ? 95 : 80;
    const explanation = practiceMatch ? "Shared religion and religious practice" : "Shared religion with different practice levels";
    return { score, explanation };
  }

  const avgImportance = (profile1.importanceOfReligion + profile2.importanceOfReligion) / 2;
  const score = Math.max(20, 100 - (avgImportance * 8));
  return { score, explanation: `Different religions, but both rate religion importance as ${avgImportance}/10` };
}

function calculateLanguageCompatibility(profile1: CulturalProfile, profile2: CulturalProfile): { score: number; explanation: string } {
  if (!profile1.motherTongue || !profile2.motherTongue) {
    return { score: 50, explanation: "Language information not available" };
  }

  const hasSharedLanguage = profile1.languages.some(lang => profile2.languages.includes(lang));
  const motherTongueMatch = profile1.motherTongue === profile2.motherTongue;

  let score = 30;
  let explanation = "";

  if (motherTongueMatch) { score += 50; explanation = "Shared mother tongue"; }
  else if (hasSharedLanguage) { score += 30; explanation = "Shared spoken language(s)"; }
  else { explanation = "Different languages, may need translation"; }

  return { score: Math.min(100, score), explanation };
}

function calculateCultureCompatibility(profile1: CulturalProfile, profile2: CulturalProfile): { score: number; explanation: string } {
  let score = 50;
  const factors: string[] = [];

  if (profile1.familyValues && profile2.familyValues) {
    if (profile1.familyValues === profile2.familyValues) { score += 20; factors.push("matching family values"); }
    else { score -= 10; factors.push("different family values"); }
  }

  if (profile1.marriageViews && profile2.marriageViews) {
    if (profile1.marriageViews === profile2.marriageViews) { score += 15; factors.push("aligned marriage views"); }
    else { score -= 10; factors.push("different marriage views"); }
  }

  if (profile1.traditionalValues && profile2.traditionalValues) {
    if (profile1.traditionalValues === profile2.traditionalValues) { score += 15; factors.push("matching traditional values"); }
  }

  const explanation = factors.length > 0 ? factors.join(", ") : "Cultural preferences not fully specified";
  return { score: Math.max(0, Math.min(100, score)), explanation };
}

function calculateFamilyCompatibility(profile1: CulturalProfile, profile2: CulturalProfile): { score: number; explanation: string } {
  let score = 60;
  const factors: string[] = [];

  if (profile1.familyBackground && profile2.familyBackground) { factors.push("Family backgrounds available for review"); }
  else { score -= 20; factors.push("Limited family background information"); }

  const explanation = factors.length > 0 ? factors.join(", ") : "Family compatibility requires more information";
  return { score, explanation };
}

function generateInsights(compatibility: CulturalCompatibilityScore): string[] {
  const insights: string[] = [];
  if (compatibility.overall >= 80) insights.push("Excellent cultural compatibility - strong foundation for a relationship");
  else if (compatibility.overall >= 60) insights.push("Good cultural compatibility with some areas to discuss");
  else if (compatibility.overall >= 40) insights.push("Moderate cultural compatibility - open communication important");
  else insights.push("Cultural differences may require significant adaptation");

  if (compatibility.factors.religion.score >= 80) insights.push("Strong religious alignment provides shared values foundation");
  else if (compatibility.factors.religion.score <= 30) insights.push("Religious differences may impact long-term compatibility");

  if (compatibility.factors.language.score <= 40) insights.push("Language barriers may affect communication and family integration");
  return insights;
}

function generateRecommendations(compatibility: CulturalCompatibilityScore): string[] {
  const recommendations: string[] = [];
  if (compatibility.overall >= 70) {
    recommendations.push("Consider family introductions and traditional courtship");
    recommendations.push("Discuss cultural expectations and family involvement early");
  } else {
    recommendations.push("Take time to understand each other's cultural backgrounds");
    recommendations.push("Consider family mediation or cultural counseling");
    recommendations.push("Discuss how to handle cultural differences in marriage");
  }
  if (compatibility.factors.religion.score <= 50) recommendations.push("Discuss religious practices and expectations for children");
  if (compatibility.factors.language.score <= 50) recommendations.push("Consider learning each other's languages");
  return recommendations;
}

export async function GET(request: NextRequest, context: { params: Promise<{ userId1: string; userId2: string }> }) {
  const handler = createAuthenticatedHandler(
    async (ctx: ApiContext) => {
      const { userId1, userId2 } = await context.params;
      const authUserId = (ctx.user as any).userId || (ctx.user as any).id;
      const isAdmin = (ctx.user as any).role === "admin";

      if (!isAdmin && authUserId !== userId1 && authUserId !== userId2) {
        return errorResponse("Unauthorized", 403, { correlationId: ctx.correlationId });
      }

      try {
        const [profile1Doc, profile2Doc] = await Promise.all([
          db.collection("culturalProfiles").doc(userId1).get(),
          db.collection("culturalProfiles").doc(userId2).get()
        ]);

        if (!profile1Doc.exists || !profile2Doc.exists) {
          return errorResponse("Cultural profiles not found for one or both users", 404, { correlationId: ctx.correlationId });
        }

        const profile1 = { _id: profile1Doc.id, ...profile1Doc.data() } as CulturalProfile;
        const profile2 = { _id: profile2Doc.id, ...profile2Doc.data() } as CulturalProfile;

        const religionCompat = calculateReligionCompatibility(profile1, profile2);
        const languageCompat = calculateLanguageCompatibility(profile1, profile2);
        const cultureCompat = calculateCultureCompatibility(profile1, profile2);
        const familyCompat = calculateFamilyCompatibility(profile1, profile2);

        const weights = { religion: 0.4, language: 0.2, culture: 0.25, family: 0.15 };
        const overall = Math.round(
          religionCompat.score * weights.religion +
          languageCompat.score * weights.language +
          cultureCompat.score * weights.culture +
          familyCompat.score * weights.family
        );

        const compatibility: CulturalCompatibilityScore = {
          overall,
          factors: {
            religion: { score: religionCompat.score, weight: weights.religion * 100, explanation: religionCompat.explanation },
            language: { score: languageCompat.score, weight: weights.language * 100, explanation: languageCompat.explanation },
            culture: { score: cultureCompat.score, weight: weights.culture * 100, explanation: cultureCompat.explanation },
            family: { score: familyCompat.score, weight: weights.family * 100, explanation: familyCompat.explanation }
          },
          insights: [],
          recommendations: []
        };

        compatibility.insights = generateInsights(compatibility);
        compatibility.recommendations = generateRecommendations(compatibility);

        return successResponse({ compatibility }, 200, ctx.correlationId);
      } catch (error) {
        console.error("cultural/compatibility error", { error, correlationId: ctx.correlationId });
        return errorResponse("Failed to calculate compatibility", 500, { correlationId: ctx.correlationId });
      }
    },
    {
      rateLimit: { identifier: "cultural_compatibility", maxRequests: 100 }
    }
  );
  return handler(request);
}
