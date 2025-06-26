import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { Notifications } from "@/lib/notify";
import { validateProfileData, sanitizeProfileInput } from "@/lib/utils/profileValidation";
import { checkApiRateLimit, logSecurityEvent } from "@/lib/utils/securityHeaders";

// Initialize Convex client (may be null if URL not configured)
const convexClient = getConvexClient();

export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication with user ID extraction
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`profile_get_${userId}`, 50, 60000); // 50 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }
    if (!client) {
      return errorResponse("Service temporarily unavailable", 503);
    }
    
    client.setAuth(token);

    try {
      // Fetch user profile from Convex
      console.log("Fetching current user with profile for userId:", userId);
      
      type UserWithProfile = {
        _id: string;
        profile?: { _id: string } | null;
        email?: string;
        // ...add other fields as needed
      };
      
      const currentUser = (await client.query(
        api.users.getCurrentUserWithProfile,
        {}
      )) as UserWithProfile;

      // Handle case where user is not found
      if (!currentUser) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', { userId, reason: 'User not found' }, request);
        return errorResponse("User session invalid or expired. Please log in again.", 401);
      }

      // Verify the user ID matches the authenticated user
      if (currentUser._id !== userId) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', { 
          userId, 
          currentUserId: currentUser._id, 
          reason: 'User ID mismatch' 
        }, request);
        return errorResponse("Unauthorized access", 403);
      }

      // Handle case where profile is null (incomplete/corrupted state)
      if (currentUser.profile === null) {
        console.warn(
          `User record found (ID: ${currentUser._id}), but profile is null. ` +
            `This indicates an incomplete profile state.`
        );

        try {
          // Attempt to clean up the incomplete user record
          if (
            currentUser.profile &&
            typeof (currentUser.profile as { _id?: unknown })._id === "string"
          ) {
            const profileWithId = currentUser.profile as { _id: string };
            await client.mutation(api.users.deleteProfile, {
              id: profileWithId._id as Id<"profiles">,
            });
            console.log(
              `User record (ID: ${currentUser._id}) deleted successfully due to null profile.`
            );
          }
          return errorResponse(
            "Your profile was incomplete or corrupted. Please sign up again.",
            401
          );
        } catch (deleteError) {
          console.error(
            `Failed to clean up user record (ID: ${currentUser._id}):`,
            deleteError
          );
          return errorResponse(
            "Profile error. Please sign out and try again or contact support.",
            401
          );
        }
      }

      // Return the valid user profile (sanitized)
      const sanitizedUser = {
        ...currentUser,
        email: currentUser.email ? currentUser.email.substring(0, 3) + "***" : undefined // Partially hide email
      };
      
      console.log("Valid profile found for user:", currentUser._id);
      return successResponse(sanitizedUser);
      
    } catch (error) {
      console.error("Error in Convex query:", error);

      // Handle Convex authentication errors
      if (
        error instanceof Error &&
        (error.message.includes("AUTHENTICATION_ERROR") || 
         error.message.includes("Unauthenticated"))
      ) {
        logSecurityEvent('INVALID_TOKEN', { userId, error: error.message }, request);
        return errorResponse("Authentication failed. Please log in again.", 401);
      }

      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Error in GET /api/profile route:", error);

    // General error handling
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to process profile request";

    return errorResponse(errorMessage, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`profile_update_${userId}`, 20, 60000); // 20 updates per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }
    if (!client) {
      return errorResponse("Service temporarily unavailable", 503);
    }
    
    client.setAuth(token);

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body || typeof body !== "object") {
      return errorResponse("Missing or invalid body", 400);
    }

    // Sanitize input data
    const sanitizedBody = sanitizeProfileInput(body);

    // Filter only the fields that are accepted by the Convex `updateProfile` mutation
    const ALLOWED_UPDATE_FIELDS = [
      "fullName",
      "dateOfBirth",
      "gender",
      "ukCity",
      "ukPostcode",
      "aboutMe",
      "religion",
      "occupation",
      "education",
      "height",
      "maritalStatus",
      "smoking",
      "drinking",
      "profileImageIds",
      "isProfileComplete",
      "phoneNumber",
      "annualIncome",
      "diet",
      "physicalStatus",
      "partnerPreferenceAgeMin",
      "partnerPreferenceAgeMax",
      "partnerPreferenceUkCity",
      "preferredGender",
      // Admin/system fields - only allow for admin users
      "isApproved",
      "hiddenFromSearch",
      "hideFromFreeUsers",
      "subscriptionPlan",
      "subscriptionExpiresAt",
    ] as const;

    // Check if user is trying to update admin-only fields
    const adminOnlyFields = ["isApproved", "subscriptionPlan", "subscriptionExpiresAt"];
    const hasAdminFields = adminOnlyFields.some(field => field in sanitizedBody);
    
    if (hasAdminFields) {
      // TODO: Check if user has admin privileges
      // For now, remove admin fields for non-admin users
      adminOnlyFields.forEach(field => delete sanitizedBody[field]);
    }

    const updates = Object.fromEntries(
      Object.entries(sanitizedBody).filter(([key]) =>
        (ALLOWED_UPDATE_FIELDS as readonly string[]).includes(key)
      )
    ) as Record<string, unknown>;

    if (Object.keys(updates).length === 0) {
      console.warn(
        "No valid update fields provided in PUT /api/profile request. Body:",
        sanitizedBody
      );
      return errorResponse("No valid profile fields provided.", 400);
    }

    // Validate the updates
    const validation = validateProfileData(updates);
    if (!validation.isValid) {
      return errorResponse(validation.error || "Invalid profile data", 400);
    }

    // Verify user owns the profile they're updating
    const currentUser = await client.query(api.users.getCurrentUserWithProfile, {});
    if (!currentUser || currentUser._id !== userId) {
      logSecurityEvent('UNAUTHORIZED_ACCESS', { 
        userId, 
        action: 'profile_update',
        reason: 'User ID mismatch' 
      }, request);
      return errorResponse("Unauthorized", 403);
    }

    // Cast `updates` to any to satisfy Convex mutation type expectations.
    // The actual runtime validation is handled by Convex schema.
    const result = await client.mutation(api.users.updateProfile, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updates: updates as any,
    });
    
    console.log("Profile update result for user:", userId);

    // Fetch the latest profile to return to the client so the UI has fresh data
    const updatedUser = (await client.query(
      api.users.getCurrentUserWithProfile,
      {}
    )) as { profile?: unknown; isProfileComplete?: boolean };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return successResponse({
      success: true,
      profile: updatedUser?.profile ?? null,
      isProfileComplete:
        (updatedUser as any)?.profile?.isProfileComplete ?? false,
      message: (result as any)?.message ?? "Profile updated successfully",
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch (error) {
    console.error("Error in profile update API route:", error);
    
    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Authentication failed", 401);
    }
    
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting for profile creation (stricter)
    const rateLimitResult = checkApiRateLimit(`profile_create_${userId}`, 3, 60000); // 3 creates per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const convex = getConvexClient();
    if (!convex) {
      return errorResponse("Service temporarily unavailable", 503);
    }
    convex.setAuth(token);

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body || typeof body !== "object") {
      return errorResponse("Missing or invalid body", 400);
    }

    // Sanitize input data
    const sanitizedBody = sanitizeProfileInput(body);

    // Validate required fields
    const requiredFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "ukCity",
      "aboutMe",
      "occupation",
      "education",
      "height",
      "maritalStatus",
    ];

    for (const field of requiredFields) {
      if (!sanitizedBody[field] || typeof sanitizedBody[field] !== "string") {
        return errorResponse(`Missing or invalid required field: ${field}`, 400);
      }
    }

    // Comprehensive profile data validation
    const validation = validateProfileData(sanitizedBody);
    if (!validation.isValid) {
      return errorResponse(validation.error || "Invalid profile data", 400);
    }

    // Check if user already has a profile
    const existingUser = await convex.query(api.users.getCurrentUserWithProfile, {});
    if (existingUser && existingUser.profile) {
      return errorResponse("Profile already exists", 409);
    }

    try {
      // Format the data for createProfile mutation
      const profileData: {
        profileFor: "self" | "friend" | "family";
        fullName: string;
        dateOfBirth: string;
        gender: "male" | "female" | "other";
        ukCity: string;
        aboutMe: string;
        occupation: string;
        education: string;
        height: string;
        maritalStatus: "single" | "divorced" | "widowed" | "annulled";
        smoking: "no" | "occasionally" | "yes" | "";
        drinking: "no" | "occasionally" | "yes";
        profileImageIds: Id<"_storage">[];
        isProfileComplete?: boolean;
      } = {
        profileFor: (sanitizedBody.profileFor as "self" | "friend" | "family") || "self",
        fullName: sanitizedBody.fullName as string,
        dateOfBirth: sanitizedBody.dateOfBirth as string,
        gender: sanitizedBody.gender as "male" | "female" | "other",
        ukCity: sanitizedBody.ukCity as string,
        aboutMe: sanitizedBody.aboutMe as string,
        occupation: sanitizedBody.occupation as string,
        education: sanitizedBody.education as string,
        height: sanitizedBody.height as string,
        maritalStatus: sanitizedBody.maritalStatus as
          | "single"
          | "divorced"
          | "widowed"
          | "annulled",
        smoking: (sanitizedBody.smoking as "no" | "occasionally" | "yes" | "") || "",
        drinking: (sanitizedBody.drinking as "no" | "occasionally" | "yes") || "no",
        profileImageIds: (sanitizedBody.profileImageIds as Id<"_storage">[]) || [],
        isProfileComplete: Boolean(sanitizedBody.isProfileComplete),
      };

      const result = await convex.mutation(api.users.createProfile, {
        ...profileData,
      });
      
      if (result && result.success === false) {
        console.error("Profile creation failed:", result.message);
        return errorResponse(result.message || "Profile creation failed", 400);
      }
      
      // After creation, fetch the latest user+profile object to return userId and _id
      const userResult = await convex.query(
        api.users.getCurrentUserWithProfile,
        {}
      );
      
      if (!userResult) {
        console.error("Profile not found after creation");
        return errorResponse("Profile not found after creation", 404);
      }

      // Verify the created profile belongs to the authenticated user
      if (userResult._id !== userId) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', { 
          userId, 
          createdUserId: userResult._id, 
          action: 'profile_creation' 
        }, req);
        return errorResponse("Profile creation failed", 500);
      }
      
      // send profile created email
      if (userResult.email && userResult.profile) {
        Notifications.profileCreated(
          userResult.email,
          userResult.profile as unknown as import("@/types/profile").Profile
        ).catch((e) => console.error("profileCreated email failed", e));
      }
      
      return successResponse({
        success: true,
        userId: userResult._id,
        profile: {
          profileFor: userResult.profile?.profileFor,
          fullName: userResult.profile?.fullName,
          dateOfBirth: userResult.profile?.dateOfBirth,
          gender: userResult.profile?.gender,
          ukCity: userResult.profile?.ukCity,
          aboutMe: userResult.profile?.aboutMe,
          occupation: userResult.profile?.occupation,
          education: userResult.profile?.education,
          height: userResult.profile?.height,
          maritalStatus: userResult.profile?.maritalStatus,
          smoking: userResult.profile?.smoking,
          drinking: userResult.profile?.drinking,
          profileImageIds: userResult.profile?.profileImageIds,
          isProfileComplete: userResult.profile?.isProfileComplete,
        },
      });
    } catch (err: unknown) {
      console.error("Error creating profile:", err);
      let message = "Failed to create profile";
      let status = 500;
      
      if (typeof err === "object" && err && "message" in err) {
        message = String((err as { message?: unknown }).message);
        console.error("Error message:", message);
        
        // Convex validation/type errors are usually 400
        if (
          message.match(
            /(invalid|type|required|missing|already exists|not authenticated|not found)/i
          )
        ) {
          status = 400;
        }
      }
      
      // In development, include error details
      const errorBody =
        process.env.NODE_ENV === "development"
          ? { error: message, details: err }
          : { error: message };
      return errorResponse((errorBody as { error: string }).error, status);
    }
  } catch (error) {
    console.error("Error in POST /api/profile:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting for profile deletion (very strict)
    const rateLimitResult = checkApiRateLimit(`profile_delete_${userId}`, 1, 60000); // 1 delete per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const client = convexClient;
    if (!client) {
      return errorResponse("Service temporarily unavailable", 503);
    }
    
    client.setAuth(token);

    // Get the current user with profile to find profile _id
    const currentUser = await client.query(
      api.users.getCurrentUserWithProfile,
      {}
    );
    
    if (!currentUser || !currentUser.profile?._id) {
      return errorResponse("No user or profile found for deletion", 404);
    }

    // Verify the user owns the profile they're deleting
    if (currentUser._id !== userId) {
      logSecurityEvent('UNAUTHORIZED_ACCESS', { 
        userId, 
        profileUserId: currentUser._id, 
        action: 'profile_deletion' 
      }, request);
      return errorResponse("Unauthorized", 403);
    }

    // Log profile deletion for security monitoring
    console.log(`Profile deletion requested by user: ${userId}`);

    const result: { success: boolean; message?: string } =
      await client.mutation(api.users.deleteProfile, {
        id: currentUser.profile._id as Id<"profiles">,
      });

    if (result && result.success) {
      console.log("User and profile deletion successful:", result.message);
      return successResponse({
        message: "User and profile deleted successfully",
      });
    } else {
      console.error("User and profile deletion failed:", result?.message);
      return errorResponse("Failed to delete user and profile", 500);
    }
  } catch (error: unknown) {
    console.error("Error in profile DELETE API route:", error);
    
    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Authentication failed", 401);
    }
    
    const errorMessage =
      (error as { data?: { message?: string } }).data?.message ||
      (error as { message?: string }).message ||
      "Internal server error";
    return errorResponse(errorMessage, 500);
  }
}