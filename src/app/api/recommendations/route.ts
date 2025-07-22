import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const convex = getConvexClient();
    if (!convex) {
      return NextResponse.json(
        { error: "Failed to initialize client" },
        { status: 500 }
      );
    }
    convex.setAuth(token);

    // Get current user's profile
    const userId = token; // Assuming token contains user ID
    const currentUserProfile = await convex.query(
      api.profiles.getProfileByUserId,
      { userId: userId as Id<"users"> }
    );

    if (!currentUserProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get all profiles excluding current user
    const allProfiles = await convex.query(api.users.adminListProfiles, {
      search: undefined,
      page: 1,
      pageSize: 50,
    });

    // Filter out current user and get public profiles
    const recommendations: any[] = [];
    const processedUserIds = new Set<string>();

    const profiles = (allProfiles as any)?.profiles || [];
    for (const profile of profiles) {
      if (profile.userId === userId || processedUserIds.has(profile.userId)) {
        continue;
      }

      try {
        const publicProfile = await convex.query(
          api.users.getUserPublicProfile,
          { userId: profile.userId as Id<"users"> }
        );

        if (publicProfile) {
          recommendations.push({
            ...publicProfile,
            _id: profile._id,
            userId: profile.userId,
            matchScore: calculateMatchScore(currentUserProfile, publicProfile),
          });
          processedUserIds.add(profile.userId);
        }

        // Limit to 10 recommendations
        if (recommendations.length >= 10) break;
      } catch (error) {
        console.error(
          `Error fetching public profile for ${profile.userId}:`,
          error
        );
      }
    }

    // Sort by match score and return
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
  let score = 0; // Start from 0 for more accurate scoring

  // Location matching (higher weight for same city)
  if (currentProfile.city && targetProfile.city) {
    if (currentProfile.city === targetProfile.city) {
      score += 30; // Same city is very important
    } else if (currentProfile.country === targetProfile.country) {
      score += 15; // Same country is good
    }
  }

  // Age compatibility (using a more nuanced approach)
  if (currentProfile.age && targetProfile.age) {
    const ageDiff = Math.abs(currentProfile.age - targetProfile.age);
    if (ageDiff <= 3) {
      score += 25; // Very compatible age range
    } else if (ageDiff <= 7) {
      score += 15; // Compatible age range
    } else if (ageDiff <= 12) {
      score += 8; // Acceptable age range
    }
  }

  // Profile completeness (higher weight for complete profiles)
  const targetCompleteness = calculateProfileCompleteness(targetProfile);
  score += Math.floor(targetCompleteness * 0.3); // Higher weight for completeness

  // Education level compatibility (if available)
  if (currentProfile.education && targetProfile.education) {
    if (currentProfile.education === targetProfile.education) {
      score += 10;
    } else if (currentProfile.education && targetProfile.education) {
      score += 5; // Both have education info
    }
  }

  // Religion compatibility (if specified)
  if (currentProfile.religion && targetProfile.religion) {
    if (currentProfile.religion === targetProfile.religion) {
      score += 15;
    }
  }

  // Height compatibility (if both have height)
  if (currentProfile.height && targetProfile.height) {
    const heightDiff = Math.abs(currentProfile.height - targetProfile.height);
    if (heightDiff <= 10) {
      score += 8;
    }
  }

  // Ensure score is between 0 and 100
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
