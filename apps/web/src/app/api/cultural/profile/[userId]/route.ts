import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  CulturalProfile,
  CulturalProfileResponse
} from "@/types/cultural";

async function getCulturalProfile(userId: string): Promise<CulturalProfileResponse> {
  try {
    const docRef = db.collection("culturalProfiles").doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: false, error: "Cultural profile not found" };
    }

    const profile = { _id: doc.id, ...doc.data() } as CulturalProfile;
    return { success: true, profile };
  } catch (error) {
    console.error("Error fetching cultural profile:", error);
    return { success: false, error: "Failed to fetch cultural profile" };
  }
}

async function createOrUpdateCulturalProfile(
  userId: string,
  profileData: Partial<CulturalProfile>
): Promise<CulturalProfileResponse> {
  try {
    const now = Date.now();
    const docRef = db.collection("culturalProfiles").doc(userId);

    const profile: CulturalProfile = {
      userId,
      religion: profileData.religion || "",
      religiousPractice: profileData.religiousPractice || "",
      motherTongue: profileData.motherTongue || "",
      languages: profileData.languages || [],
      familyValues: profileData.familyValues || "",
      marriageViews: profileData.marriageViews || "",
      traditionalValues: profileData.traditionalValues || "",
      importanceOfReligion: profileData.importanceOfReligion || 5,
      importanceOfCulture: profileData.importanceOfCulture || 5,
      familyBackground: profileData.familyBackground,
      createdAt: profileData.createdAt || now,
      updatedAt: now,
    };

    await docRef.set(profile, { merge: true });

    // Fetch the updated profile
    const updatedDoc = await docRef.get();
    const updatedProfile = { _id: updatedDoc.id, ...updatedDoc.data() } as CulturalProfile;

    return { success: true, profile: updatedProfile };
  } catch (error) {
    console.error("Error creating/updating cultural profile:", error);
    return { success: false, error: "Failed to save cultural profile" };
  }
}

// GET /api/cultural/profile/:userId
export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  return withFirebaseAuth(async (user, request, ctx: { params: Promise<{ userId: string }> }) => {
    const { userId } = await ctx.params;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`cultural_profile_get_${user.id}`, 100, 60000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Users can only access their own profiles or admins can access any
    const authUserId = user.id;
    const isAdmin = user.role === "admin";

  if (!isAdmin && authUserId !== userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const result = await getCulturalProfile(userId);

  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
  })(req, context);
}

// POST /api/cultural/profile/:userId
export async function POST(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  return withFirebaseAuth(async (user, request, ctx: { params: Promise<{ userId: string }> }) => {
    const { userId } = await ctx.params;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`cultural_profile_post_${user.id}`, 50, 60000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Users can only update their own profiles or admins can update any
    const authUserId = user.id;
    const isAdmin = user.role === "admin";

  if (!isAdmin && authUserId !== userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "religion",
      "religiousPractice",
      "motherTongue",
      "languages",
      "familyValues",
      "marriageViews",
      "traditionalValues"
    ];

    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`
        },
        { status: 400 }
      );
    }

    // Validate importance ratings
    if (body.importanceOfReligion && (body.importanceOfReligion < 1 || body.importanceOfReligion > 10)) {
      return NextResponse.json(
        { success: false, error: "Importance of religion must be between 1-10" },
        { status: 400 }
      );
    }

    if (body.importanceOfCulture && (body.importanceOfCulture < 1 || body.importanceOfCulture > 10)) {
      return NextResponse.json(
        { success: false, error: "Importance of culture must be between 1-10" },
        { status: 400 }
      );
    }

    const result = await createOrUpdateCulturalProfile(userId, body);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error processing cultural profile request:", error);
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
  })(req, context);
}
