import {
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext,
  validateQueryParams
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { publicProfileQuerySchema } from "@/lib/validation/apiSchemas/publicProfile";

/**
 * GET /api/public-profile?userId=xxx
 * Returns public profile data for a given user (no auth required).
 */
export const GET = createApiHandler(
  async (ctx: ApiContext) => {
    const validationResult = validateQueryParams(
      ctx.request,
      publicProfileQuerySchema
    );
    if (!validationResult.success) {
      return errorResponse("Missing userId", 400, {
        correlationId: ctx.correlationId,
      });
    }

    const { userId } = validationResult.data;

    try {
      const snap = await db.collection("users").doc(userId).get();
      
      if (!snap.exists) {
        console.info("Public profile GET not found", {
          scope: "public_profile.get",
          type: "not_found",
          correlationId: ctx.correlationId,
          statusCode: 404,
          durationMs: Date.now() - ctx.startTime,
        });
        return errorResponse("Not found", 404, { correlationId: ctx.correlationId });
      }

      const data = snap.data() as any;
      
      // Filter sensitive fields for public profile
      const publicProfile = {
        userId,
        fullName: data.fullName,
        age: data.age,
        city: data.city,
        country: data.country,
        aboutMe: data.aboutMe,
        occupation: data.occupation,
        education: data.education,
        height: data.height,
        religion: data.religion,
        motherTongue: data.motherTongue,
        ethnicity: data.ethnicity,
        profileImageUrls: data.profileImageUrls,
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        diet: data.diet,
        smoking: data.smoking,
        drinking: data.drinking,
        profileFor: data.profileFor,
        createdAt: data.createdAt,
        lastActive: data.lastActive,
        isVerified: data.isVerified,
      };

      console.info("Public profile GET success", {
        scope: "public_profile.get",
        type: "success",
        correlationId: ctx.correlationId,
        statusCode: 200,
        durationMs: Date.now() - ctx.startTime,
      });

      return successResponse(publicProfile, 200, ctx.correlationId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Public profile GET unhandled error", {
        scope: "public_profile.get",
        type: "unhandled_error",
        message,
        correlationId: ctx.correlationId,
        statusCode: 500,
        durationMs: Date.now() - ctx.startTime,
      });
      return errorResponse("Failed to fetch profile", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    requireAuth: false, // Public endpoint
    rateLimit: { identifier: "public_profile", maxRequests: 100 }
  }
);
