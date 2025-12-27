import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import type { CulturalProfile } from "@aroosi/shared/types";
import { NextRequest } from "next/server";

async function getCulturalProfile(userId: string): Promise<{ success: boolean; profile?: CulturalProfile; error?: string }> {
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

async function createOrUpdateCulturalProfile(userId: string, profileData: Partial<CulturalProfile>): Promise<{ success: boolean; profile?: CulturalProfile; error?: string }> {
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
    const updatedDoc = await docRef.get();
    const updatedProfile = { _id: updatedDoc.id, ...updatedDoc.data() } as CulturalProfile;

    return { success: true, profile: updatedProfile };
  } catch (error) {
    console.error("Error creating/updating cultural profile:", error);
    return { success: false, error: "Failed to save cultural profile" };
  }
}

const profileSchema = z.object({
  religion: z.string(),
  religiousPractice: z.string(),
  motherTongue: z.string().min(1),
  languages: z.array(z.string()),
  familyValues: z.string(),
  marriageViews: z.string(),
  traditionalValues: z.string(),
  importanceOfReligion: z.number().min(1).max(10).optional(),
  importanceOfCulture: z.number().min(1).max(10).optional(),
  familyBackground: z.string().optional(),
});

// Helper to extract userId from params
async function extractUserId(ctx: ApiContext): Promise<string | null> {
  const urlParts = ctx.request.url.split("/");
  const userIdIdx = urlParts.findIndex(p => p === "profile") + 1;
  return urlParts[userIdIdx] || null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const handler = createAuthenticatedHandler(
    async (ctx: ApiContext) => {
      const { userId } = await context.params;
      const authUserId = (ctx.user as any).userId || (ctx.user as any).id;
      const isAdmin = (ctx.user as any).role === "admin";

      if (!isAdmin && authUserId !== userId) {
        return errorResponse("Unauthorized", 403, { correlationId: ctx.correlationId });
      }

      const result = await getCulturalProfile(userId);
      if (!result.success) {
        return errorResponse(result.error || "Not found", 404, { correlationId: ctx.correlationId });
      }

      return successResponse({ profile: result.profile }, 200, ctx.correlationId);
    },
    {
      rateLimit: { identifier: "cultural_profile_get", maxRequests: 100 }
    }
  );
  return handler(request);
}

export async function POST(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const handler = createAuthenticatedHandler(
    async (ctx: ApiContext, body: z.infer<typeof profileSchema>) => {
      const { userId } = await context.params;
      const authUserId = (ctx.user as any).userId || (ctx.user as any).id;
      const isAdmin = (ctx.user as any).role === "admin";

      if (!isAdmin && authUserId !== userId) {
        return errorResponse("Unauthorized", 403, { correlationId: ctx.correlationId });
      }

      const result = await createOrUpdateCulturalProfile(userId, body as unknown as Partial<CulturalProfile>);
      if (!result.success) {
        return errorResponse(result.error || "Failed", 500, { correlationId: ctx.correlationId });
      }

      return successResponse({ profile: result.profile }, 201, ctx.correlationId);
    },
    {
      bodySchema: profileSchema,
      rateLimit: { identifier: "cultural_profile_post", maxRequests: 50 }
    }
  );
  return handler(request);
}
