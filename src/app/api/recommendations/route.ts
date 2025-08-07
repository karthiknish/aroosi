import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { requireAuth } from "@/lib/auth/requireAuth";
import { convexQueryWithAuth } from "@/lib/convexServer";

export async function GET(request: NextRequest) {
  try {
    // Cookie session auth
    const { userId } = await requireAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's profile
    const currentUserProfile = await convexQueryWithAuth(
      request,
      (await import("@convex/_generated/api")).api.profiles.getProfileByUserId,
      { userId: userId as Id<"users"> }
    );

    if (!currentUserProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch a public list via users.searchPublicProfiles and filter out the current user
    const candidates = await convexQueryWithAuth(
      request,
      (await import("@convex/_generated/api")).api.users.searchPublicProfiles,
      { term: undefined, limit: 100 }
    ).catch(() => []);

    const recommendations: any[] = [];
    const processedUserIds = new Set<string>();

    for (const p of (candidates as any[]) || []) {
      const candidateUserId = String(p.userId ?? "");
      if (!candidateUserId || candidateUserId === userId || processedUserIds.has(candidateUserId)) {
        continue;
      }
      try {
        const publicProfile = await convexQueryWithAuth(
          request,
          (await import("@convex/_generated/api")).api.users.getProfileByUserIdPublic,
          { userId: candidateUserId as Id<"users"> }
        );

        if (publicProfile) {
          recommendations.push({
            ...publicProfile,
            userId: candidateUserId,
            matchScore: calculateMatchScore(currentUserProfile, publicProfile),
          });
          processedUserIds.add(candidateUserId);
        }

        if (recommendations.length >= 10) break;
      } catch (e) {
        console.error(`Error fetching public profile for ${candidateUserId}:`, e);
      }
    }

    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      recommendations,
      total: recommendations.length,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}

function calculateMatchScore(currentProfile: any, targetProfile: any): number {
  let score = 0;

  if (currentProfile.city && targetProfile.city) {
    if (currentProfile.city === targetProfile.city) {
      score += 30;
    } else if (currentProfile.country === targetProfile.country) {
      score += 15;
    }
  }

  if (currentProfile.age && targetProfile.age) {
    const ageDiff = Math.abs(currentProfile.age - targetProfile.age);
    if (ageDiff <= 3) score += 25;
    else if (ageDiff <= 7) score += 15;
    else if (ageDiff <= 12) score += 8;
  }

  const targetCompleteness = calculateProfileCompleteness(targetProfile);
  score += Math.floor(targetCompleteness * 0.3);

  if (currentProfile.education && targetProfile.education) {
    if (currentProfile.education === targetProfile.education) score += 10;
    else score += 5;
  }

  if (currentProfile.religion && targetProfile.religion) {
    if (currentProfile.religion === targetProfile.religion) score += 15;
  }

  if (currentProfile.height && targetProfile.height) {
    const heightDiff = Math.abs(currentProfile.height - targetProfile.height);
    if (heightDiff <= 10) score += 8;
  }

  return Math.max(0, Math.min(score, 100));
}

function calculateProfileCompleteness(profile: any): number {
  let completedFields = 0;
  let totalFields = 0;

  const fields = [
    "name",
    "age",
    "city",
    "country",
    "bio",
    "occupation",
    "education",
    "height",
    "religion",
    "maritalStatus",
  ];

  for (const field of fields) {
    totalFields++;
    if (profile[field] && profile[field].toString().trim()) {
      completedFields++;
    }
  }

  return (completedFields / totalFields) * 100;
}
