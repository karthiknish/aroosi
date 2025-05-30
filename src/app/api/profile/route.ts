import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      console.error("No token provided in GET /api/profile");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    convexClient.setAuth(token);

    console.log("Fetching current user with profile in GET /api/profile");
    const currentUser = await convexClient.query(
      api.users.getCurrentUserWithProfile,
      {}
    );

    if (!currentUser) {
      console.log(
        "User record not found in Convex for the given token. Signaling logout."
      );
      // This case means the token is likely invalid, or the user was deleted from Convex
      // but the client still has an old token.
      return NextResponse.json(
        { error: "User session invalid or expired. Please log in again." },
        { status: 401 } // Unauthorized, client should clear session and redirect to login
      );
    }

    // Case: User record exists, but the profile sub-document is null.
    // This indicates an incomplete or corrupted state that needs cleanup.
    if (currentUser.profile === null) {
      console.warn(
        `User record found (ID: ${currentUser._id}), but profile is null. ` +
          `This indicates an incomplete profile state. Deleting user record and signaling logout.`
      );
      try {
        // This mutation should handle deleting the Convex user document,
        // associated images, and trigger Clerk user deletion via an internal action.
        await convexClient.mutation(api.users.deleteCurrentUserProfile, {});
        console.log(
          `User record (ID: ${currentUser._id}) deleted successfully due to null profile.`
        );
        // Signal to client to logout. A 401 is appropriate here as the user's session
        // is effectively invalidated by deleting their record.
        return NextResponse.json(
          {
            error:
              "User profile was incomplete and has been cleared. Please log in again to create a new profile.",
          },
          { status: 401 }
        );
      } catch (deleteError) {
        console.error(
          `Error deleting user record (ID: ${currentUser._id}) with null profile:`,
          deleteError
        );
        // If deletion fails, this is a server-side issue.
        return NextResponse.json(
          {
            error:
              "Failed to clean up incomplete user profile. Please contact support.",
            details:
              deleteError instanceof Error
                ? deleteError.message
                : String(deleteError),
          },
          { status: 500 }
        );
      }
    }

    console.log("Valid profile found for user:", currentUser._id);
    return NextResponse.json(currentUser);
  } catch (error) {
    console.error("Error in GET /api/profile route:", error);
    // General error handling
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Check if the error is from Convex and has a specific structure
    // (e.g., if Convex throws an object with a `data` field for auth errors)
    // This part is speculative and depends on how ConvexHttpClient surfaces errors.
    // For instance, if an auth error from Convex has a specific code or message:
    // if (typeof error === 'object' && error !== null && (error as any).data?.code === 'AUTHENTICATION_ERROR') {
    //   return NextResponse.json({ error: "Authentication failed with Convex." }, { status: 401 });
    // }

    return NextResponse.json(
      {
        error: "Internal server error processing profile request.",
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

    console.log("Setting auth token for Convex (DELETE)");
    convexClient.setAuth(token);

    console.log("Attempting to delete current user profile");
    const result: { success: boolean; message?: string } =
      await convexClient.mutation(api.users.deleteCurrentUserProfile, {});

    if (result && result.success) {
      console.log("Profile deletion successful:", result.message);
      return NextResponse.json({
        success: true,
        message: result.message || "Profile deleted successfully",
      });
    } else {
      console.error("Profile deletion failed:", result?.message);
      return NextResponse.json(
        { error: "Failed to delete profile", details: result?.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in profile DELETE API route:", error);
    const errorMessage =
      error.data?.message || error.message || "Internal server error";
    const errorDetails = error.data || error;
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
