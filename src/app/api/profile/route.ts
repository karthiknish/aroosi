import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    // Validate Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error(
        "Invalid or missing Authorization header in GET /api/profile"
      );
      return NextResponse.json(
        { error: "Invalid or missing Authorization header" },
        { status: 401 }
      );
    }

    // Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      console.error("No token provided in Authorization header");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    try {
      // Set auth token for Convex client
      convexClient.setAuth(token);

      // Fetch user profile from Convex
      console.log("Fetching current user with profile in GET /api/profile");
      const currentUser = await convexClient.query(
        api.users.getCurrentUserWithProfile,
        {}
      );

      // Handle case where user is not found
      if (!currentUser) {
        console.log("User record not found in Convex for the given token");
        return NextResponse.json(
          { error: "User session invalid or expired. Please log in again." },
          { status: 401 }
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
          if (currentUser.profile?._id) {
            await convexClient.mutation(api.users.deleteProfile, {
              id: currentUser.profile._id as Id<"profiles">,
            });
            console.log(
              `User record (ID: ${currentUser._id}) deleted successfully due to null profile.`
            );
          }
          return NextResponse.json(
            {
              error:
                "Your profile was incomplete or corrupted. Please sign up again.",
            },
            { status: 401 }
          );
        } catch (deleteError) {
          console.error(
            `Failed to clean up user record (ID: ${currentUser._id}):`,
            deleteError
          );
          return NextResponse.json(
            {
              error:
                "Profile error. Please sign out and try again or contact support.",
            },
            { status: 401 }
          );
        }
      }

      // Return the valid user profile
      console.log("Valid profile found for user:", currentUser._id);
      return NextResponse.json(currentUser);
    } catch (error) {
      console.error("Error in Convex query:", error);

      // Handle Convex authentication errors
      if (
        error instanceof Error &&
        error.message.includes("AUTHENTICATION_ERROR")
      ) {
        return NextResponse.json(
          { error: "Authentication failed. Please log in again." },
          { status: 401 }
        );
      }

      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Error in GET /api/profile route:", error);

    // General error handling
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        error: "Failed to process profile request",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      console.error("No token provided in request");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    console.log("Setting auth token for Convex");
    convexClient.setAuth(token);

    const body = await request.json();
    console.log("Updating profile with data:", body);

    const result = await convexClient.mutation(api.users.updateProfile, {
      updates: body,
    });
    console.log("Profile update result:", result);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in profile update API route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    console.error("Unauthorized: Missing or invalid token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    console.error("Invalid JSON body in request");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    console.error("Missing or invalid body in request");
    return NextResponse.json(
      { error: "Missing or invalid body" },
      { status: 400 }
    );
  }
  // Validate required fields
  const requiredFields = [
    "fullName",
    "dateOfBirth",
    "gender",
    "ukCity",
    "aboutMe",
    "religion",
    "occupation",
    "education",
    "height",
    "maritalStatus",
  ];

  for (const field of requiredFields) {
    if (!body[field] || typeof body[field] !== "string") {
      console.error(`Missing or invalid required field: ${field}`);
      return NextResponse.json(
        { error: `Missing or invalid required field: ${field}` },
        { status: 400 }
      );
    }
  }

  // Validate gender
  if (!["male", "female", "other"].includes(body.gender as string)) {
    console.error("Invalid gender value:", body.gender);
    return NextResponse.json(
      { error: "Invalid gender value" },
      { status: 400 }
    );
  }

  // Validate marital status
  if (
    !["single", "divorced", "widowed", "annulled"].includes(
      body.maritalStatus as string
    )
  ) {
    console.error("Invalid marital status value:", body.maritalStatus);
    return NextResponse.json(
      { error: "Invalid marital status value" },
      { status: 400 }
    );
  }

  try {
    // Format the data for createProfile mutation
    const profileData: {
      fullName: string;
      dateOfBirth: string;
      gender: "male" | "female" | "other";
      ukCity: string;
      aboutMe: string;
      religion: string;
      occupation: string;
      education: string;
      height: string;
      maritalStatus: "single" | "divorced" | "widowed" | "annulled";
      smoking: "no" | "occasionally" | "yes" | "";
      drinking: "no" | "occasionally" | "yes";
      profileImageIds: Id<"_storage">[];
      isProfileComplete?: boolean;
    } = {
      fullName: body.fullName as string,
      dateOfBirth: body.dateOfBirth as string,
      gender: body.gender as "male" | "female" | "other",
      ukCity: body.ukCity as string,
      aboutMe: body.aboutMe as string,
      religion: body.religion as string,
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

    const result = await convex.mutation(api.users.createProfile, profileData);
    if (result && result.success === false) {
      console.error("Profile creation failed:", result.message);
      return NextResponse.json(
        { error: result.message || "Profile creation failed" },
        { status: 400 }
      );
    }
    // After creation, fetch the latest user+profile object to return userId and _id
    const userResult = await convex.query(
      api.users.getCurrentUserWithProfile,
      {}
    );
    if (!userResult) {
      console.error("Profile not found after creation");
      return NextResponse.json(
        { error: "Profile not found after creation" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      userId: userResult._id,
      profile: {
        fullName: userResult.profile?.fullName,
        dateOfBirth: userResult.profile?.dateOfBirth,
        gender: userResult.profile?.gender,
        ukCity: userResult.profile?.ukCity,
        aboutMe: userResult.profile?.aboutMe,
        religion: userResult.profile?.religion,
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
    return NextResponse.json(errorBody, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      console.error("No token provided for DELETE request");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    convexClient.setAuth(token);

    // Get the current user with profile to find profile _id
    const currentUser = await convexClient.query(
      api.users.getCurrentUserWithProfile,
      {}
    );
    if (!currentUser || !currentUser.profile?._id) {
      console.error("No user or profile found for deletion");
      return NextResponse.json(
        { error: "No user or profile found for deletion" },
        { status: 404 }
      );
    }

    const result: { success: boolean; message?: string } =
      await convexClient.mutation(api.users.deleteProfile, {
        id: currentUser.profile._id as Id<"profiles">,
      });

    if (result && result.success) {
      console.log("User and profile deletion successful:", result.message);
      return NextResponse.json({
        success: true,
        message: result.message || "User and profile deleted successfully",
      });
    } else {
      console.error("User and profile deletion failed:", result?.message);
      return NextResponse.json(
        {
          error: "Failed to delete user and profile",
          details: result?.message,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Error in profile DELETE API route:", error);
    const errorMessage =
      (error as { data?: { message?: string } }).data?.message ||
      (error as { message?: string }).message ||
      "Internal server error";
    const errorDetails = (error as { data?: unknown }).data || error;
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
