import { NextRequest } from "next/server";
import { Notifications } from "@/lib/notify";
import {
  sanitizeProfileInput,
} from "@/lib/utils/profileValidation";
import { normalizePartnerPreferences } from "@/lib/validation/arrayNormalization";
import { db } from "@/lib/firebaseAdmin";
import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  AuthenticatedApiContext
} from "@/lib/api/handler";
import { profileSchema, createProfileSchema, updateProfileSchema } from "@/lib/validation/profileSchema";

const PROTECTED_FIELDS = [
  'id', 'uid', 'email', 'emailVerified', 'createdAt', 'role', 
  'banned', 'banReason', 'banExpiresAt', 'disabled',
  'subscriptionPlan', 'subscriptionExpiresAt', 'subscriptionFeatures',
  'boostsRemaining', 'boostedUntil', 'hasSpotlightBadge', 
  'spotlightBadgeExpiresAt', 'totalProfileViews', 'totalMessagesSent',
  'totalMessagesReceived', 'totalLikesGiven', 'totalLikesReceived',
  'totalMatches', 'loginCount', 'lastLoginAt', 'referredBy', 
  'referredUsers', 'referralCode'
];

function isProfileWithEmail(
  profile: unknown
): profile is import("@aroosi/shared/types").Profile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    typeof (profile as { email?: unknown }).email === "string"
  );
}

export const GET = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  // Support fetching a specific user's profile via ?userId= query param
  // Falls back to authenticated user's own profile if not specified
  const requestedUserId = ctx.request.nextUrl.searchParams.get("userId");
  const authUserId = ctx.user.id;
  
  // Use requested userId if provided, otherwise use authenticated user's ID
  const userId = requestedUserId || authUserId;
  
  if (!userId) {
    return errorResponse("User ID is required", 400, { correlationId: ctx.correlationId });
  }
  
  try {
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists) {
      return errorResponse("User profile not found", 404, { correlationId: ctx.correlationId });
    }
    
    const profile = { _id: doc.id, ...(doc.data() as any) };
    
    // If fetching another user's profile, remove sensitive fields
    if (requestedUserId && requestedUserId !== authUserId) {
      // Remove sensitive fields for other users' profiles
      PROTECTED_FIELDS.forEach(field => delete profile[field]);
    }
    
    console.info("Profile GET success", {
      scope: "profile.get",
      type: "success",
      correlationId: ctx.correlationId,
      statusCode: 200,
      durationMs: Date.now() - ctx.startTime,
      requestedUserId: requestedUserId || "(self)",
    });
    
    return successResponse(profile, 200, ctx.correlationId);
  } catch (e) {
    console.error("Profile GET firebase error", {
      message: e instanceof Error ? e.message : String(e),
      correlationId: ctx.correlationId,
    });
    return errorResponse("Failed to process profile request", 500, { correlationId: ctx.correlationId });
  }
}, {
  rateLimit: { identifier: "profile_get", maxRequests: 50 }
});

const handleUpdate = async (ctx: AuthenticatedApiContext, body: any) => {
  const userId = ctx.user.id;
  
  try {
    // Strip protected fields from user updates
    const updates = { ...body };
    PROTECTED_FIELDS.forEach(field => {
      if (field in updates) delete updates[field];
    });

    const sanitizedBody = sanitizeProfileInput(updates);
    // Normalize partner preferences to arrays
    normalizePartnerPreferences(sanitizedBody);
    
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists) {
      return errorResponse("User profile not found", 404, { correlationId: ctx.correlationId });
    }
    
    await db
      .collection("users")
      .doc(userId)
      .set({ ...sanitizedBody, updatedAt: Date.now() }, { merge: true });
      
    const updated = await db.collection("users").doc(userId).get();
    const updatedProfile = { _id: updated.id, ...(updated.data() as any) };
    
    if (isProfileWithEmail(updatedProfile)) {
      try {
        await Notifications.profileCreated(updatedProfile.email, updatedProfile);
        await Notifications.profileCreatedAdmin(updatedProfile);
      } catch (e) {
        console.error("Profile update notification error", {
          message: e instanceof Error ? e.message : String(e),
          correlationId: ctx.correlationId,
        });
      }
    }
    
    console.info("Profile update success", {
      scope: "profile.update",
      type: "success",
      correlationId: ctx.correlationId,
      statusCode: 200,
      durationMs: Date.now() - ctx.startTime,
      method: ctx.request.method
    });
    
    return successResponse({ 
      ...updatedProfile, 
      message: "Profile updated successfully" 
    }, 200, ctx.correlationId);
  } catch (e) {
    console.error("Profile update firebase error", {
      message: e instanceof Error ? e.message : String(e),
      correlationId: ctx.correlationId,
    });
    return errorResponse("Internal server error", 500, { correlationId: ctx.correlationId });
  }
};

export const PUT = createAuthenticatedHandler(handleUpdate, {
  bodySchema: updateProfileSchema,
  rateLimit: { identifier: "profile_update", maxRequests: 20 }
});

export const PATCH = createAuthenticatedHandler(handleUpdate, {
  bodySchema: updateProfileSchema,
  rateLimit: { identifier: "profile_update", maxRequests: 20 }
});

export const POST = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, body: any) => {
  const userId = ctx.user.id;
  
  try {
    const sanitizedBody = sanitizeProfileInput(body);
    
    const existingProfile = await db.collection("users").doc(userId).get();
    if (existingProfile.exists) {
      return errorResponse("Profile already exists", 409, { correlationId: ctx.correlationId });
    }

    const filteredImageIds = Array.isArray(sanitizedBody.profileImageIds)
      ? (sanitizedBody.profileImageIds as string[]).filter(
          (id) => typeof id === "string" && !id.startsWith("local-")
        )
      : undefined;

    const now = Date.now();
    const profileData = {
      ...sanitizedBody,
      profileImageIds: filteredImageIds,
      createdAt: now,
      updatedAt: now,
      userId,
      email: ctx.user.email || sanitizedBody.email,
      isProfileComplete: true,
    };

    await db
      .collection("users")
      .doc(userId)
      .set(profileData, { merge: true });
      
    const newProfileSnap = await db.collection("users").doc(userId).get();
    const newProfile = {
      _id: newProfileSnap.id,
      ...(newProfileSnap.data() as any),
    };
    
    if (isProfileWithEmail(newProfile)) {
      try {
        await Notifications.profileCreated(newProfile.email, newProfile);
        await Notifications.profileCreatedAdmin(newProfile);
      } catch (e) {
        console.error("Profile POST notification error", {
          scope: "profile.create",
          type: "notify_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId: ctx.correlationId,
        });
      }
    }
    
    console.info("Profile POST success", {
      scope: "profile.create",
      type: "success",
      correlationId: ctx.correlationId,
      statusCode: 200,
      durationMs: Date.now() - ctx.startTime,
    });
    
    return successResponse({ 
      ...newProfile, 
      message: "Profile created successfully" 
    }, 200, ctx.correlationId);
  } catch (error) {
    console.error("Profile POST unhandled error", {
      scope: "profile.create",
      type: "unhandled_error",
      message: error instanceof Error ? error.message : String(error),
      correlationId: ctx.correlationId,
      statusCode: 500,
      durationMs: Date.now() - ctx.startTime,
    });
    return errorResponse("Internal server error", 500, { correlationId: ctx.correlationId });
  }
}, {
  bodySchema: createProfileSchema,
  rateLimit: { identifier: "profile_create", maxRequests: 3 }
});

export const DELETE = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  const userId = ctx.user.id;
  
  try {
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists) {
      return errorResponse("No user or profile found for deletion", 404, { correlationId: ctx.correlationId });
    }
    
    await db.collection("users").doc(userId).delete();
    
    console.info("Profile DELETE success", {
      scope: "profile.delete",
      type: "success",
      correlationId: ctx.correlationId,
      statusCode: 200,
      durationMs: Date.now() - ctx.startTime,
    });
    
    return successResponse({ message: "User and profile deleted successfully" }, 200, ctx.correlationId);
  } catch (error) {
    console.error("Profile DELETE unhandled error", {
      scope: "profile.delete",
      type: "unhandled_error",
      message: error instanceof Error ? error.message : String(error),
      correlationId: ctx.correlationId,
      statusCode: 500,
      durationMs: Date.now() - ctx.startTime,
    });
    return errorResponse("Failed to delete user and profile", 500, { correlationId: ctx.correlationId });
  }
}, {
  rateLimit: { identifier: "profile_delete", maxRequests: 1 }
});
