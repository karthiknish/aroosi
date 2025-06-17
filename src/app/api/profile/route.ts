import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { Notifications } from "@/lib/notify";

// Initialize Convex client (may be null if URL not configured)
const convexClient = getConvexClient();

export async function GET(request: Request) {
  let client = convexClient;

  try {
    // Validate Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error(
        "Invalid or missing Authorization header in GET /api/profile"
      );
      return errorResponse("Invalid or missing Authorization header", 401);
    }

    // Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      console.error("No token provided in Authorization header");
      return errorResponse("No token provided", 401);
    }

    try {
      // Initialize Convex client lazily if not already
      if (!client) {
        client = getConvexClient();
      }
      if (!client) {
        return errorResponse("Convex backend not configured", 500);
      }
      client.setAuth(token);

      // Fetch user profile from Convex
      console.log("Fetching current user with profile in GET /api/profile");
      type UserWithProfile = {
        _id: string;
        profile?: { _id: string } | null;
        // ...add other fields as needed
      };
      const currentUser = (await client.query(
        api.users.getCurrentUserWithProfile,
        {}
      )) as UserWithProfile;

      // Handle case where user is not found
      if (!currentUser) {
        console.log("User record not found in Convex for the given token");
        return errorResponse(
          "User session invalid or expired. Please log in again.",
          401
        );
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

      // Return the valid user profile
      console.log("Valid profile found for user:", currentUser._id);
      return successResponse(currentUser);
    } catch (error) {
      console.error("Error in Convex query:", error);

      // Handle Convex authentication errors
      if (
        error instanceof Error &&
        error.message.includes("AUTHENTICATION_ERROR")
      ) {
        return errorResponse(
          "Authentication failed. Please log in again.",
          401
        );
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

export async function PUT(request: Request) {
  let client = convexClient;

  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      console.error("No token provided in request");
      return errorResponse("No token provided", 401);
    }

    if (!client) {
      client = getConvexClient();
    }
    if (!client) {
      return errorResponse("Convex backend not configured", 500);
    }
    console.log("Setting auth token for Convex");
    client.setAuth(token);

    const body = await request.json();
    console.log("Updating profile with data:", body);

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
      "isApproved",
      "hiddenFromSearch",
      "hideFromFreeUsers",
      "subscriptionPlan",
      "subscriptionExpiresAt",
    ] as const;

    const updates = Object.fromEntries(
      Object.entries(body).filter(([key]) =>
        (ALLOWED_UPDATE_FIELDS as readonly string[]).includes(key)
      )
    ) as Record<string, unknown>;

    if (Object.keys(updates).length === 0) {
      console.warn(
        "No valid update fields provided in PUT /api/profile request. Body:",
        body
      );
      return errorResponse("No valid profile fields provided.", 400);
    }

    // Cast `updates` to any to satisfy Convex mutation type expectations.
    // The actual runtime validation is handled by Convex schema.
    const result = await client.mutation(api.users.updateProfile, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updates: updates as any,
    });
    console.log("Profile update result:", result);

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
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    console.error("Unauthorized: Missing or invalid token");
    return errorResponse("Unauthorized", 401);
  }
  const convex = getConvexClient();
  if (!convex) {
    return errorResponse("Convex backend not configured", 500);
  }
  convex.setAuth(token);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    console.error("Invalid JSON body in request");
    return errorResponse("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object") {
    console.error("Missing or invalid body in request");
    return errorResponse("Missing or invalid body", 400);
  }
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
    if (!body[field] || typeof body[field] !== "string") {
      console.error(`Missing or invalid required field: ${field}`);
      return errorResponse(`Missing or invalid required field: ${field}`, 400);
    }
  }

  // Validate gender
  if (!["male", "female", "other"].includes(body.gender as string)) {
    console.error("Invalid gender value:", body.gender);
    return errorResponse("Invalid gender value", 400);
  }

  // Validate marital status
  if (
    !["single", "divorced", "widowed", "annulled"].includes(
      body.maritalStatus as string
    )
  ) {
    console.error("Invalid marital status value:", body.maritalStatus);
    return errorResponse("Invalid marital status value", 400);
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
      profileFor: body.profileFor as "self" | "friend" | "family",
      fullName: body.fullName as string,
      dateOfBirth: body.dateOfBirth as string,
      gender: body.gender as "male" | "female" | "other",
      ukCity: body.ukCity as string,
      aboutMe: body.aboutMe as string,
      occupation: body.occupation as string,
      education: body.education as string,
      height: body.height as string,
      maritalStatus: body.maritalStatus as
        | "single"
        | "divorced"
        | "widowed"
        | "annulled",
      smoking: (body.smoking as "no" | "occasionally" | "yes" | "") || "",
      drinking: (body.drinking as "no" | "occasionally" | "yes") || "no",
      profileImageIds: (body.profileImageIds as Id<"_storage">[]) || [],
      isProfileComplete: Boolean(body.isProfileComplete),
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
}

export async function DELETE(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      console.error("No token provided for DELETE request");
      return errorResponse("No token provided", 401);
    }

    const client = convexClient;
    if (!client) {
      return errorResponse("Convex backend not configured", 500);
    }

    // Get the current user with profile to find profile _id
    const currentUser = await client.query(
      api.users.getCurrentUserWithProfile,
      {}
    );
    if (!currentUser || !currentUser.profile?._id) {
      console.error("No user or profile found for deletion");
      return errorResponse("No user or profile found for deletion", 404);
    }

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
    const errorMessage =
      (error as { data?: { message?: string } }).data?.message ||
      (error as { message?: string }).message ||
      "Internal server error";
    return errorResponse(errorMessage, 500);
  }
}
