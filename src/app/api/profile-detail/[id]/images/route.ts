import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";

// Add debug logging
const debug = process.env.NODE_ENV === "development";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const requestId = Math.random().toString(36).substring(2, 9);

  const log = (message: string, data?: unknown) => {
    if (debug) {
      console.log(
        `[${new Date().toISOString()}] [${requestId}] ${message}`,
        data || ""
      );
    }
  };

  try {
    log("Processing request", { path: url.pathname });

    await requireAuth(req);

    // Get the ID from the URL
    const segments = url.pathname.split("/").filter(Boolean);
    const idIndex = segments.indexOf("profile-detail") + 1;
    const id = segments[idIndex];

    if (!id) {
      log("No ID found in URL", { segments, pathname: url.pathname });
      return NextResponse.json(
        {
          error: "Profile or user ID is required",
          requestId,
          details: `URL path format should be /api/profile-detail/[id]/images`,
        },
        { status: 400 }
      );
    }

    // Validate ID format (basic check for Convex IDs)
    const isValidId = /^[a-z0-9]+$/.test(id);
    if (!isValidId) {
      log("Invalid ID format", { id });
      return NextResponse.json(
        {
          error: "Invalid ID format",
          requestId,
          details: "ID should only contain alphanumeric characters",
        },
        { status: 400 }
      );
    }

    log("Fetching profile details", { profileId: id });

    let userId: Id<"users"> | null = null;
    let images: unknown[] = [];

    try {
      // Only try getProfileById if the id is likely a profileId (e.g., if you have a prefix or length check, use it here)
      // Otherwise, skip to getUserPublicProfile
      if (id && id.length === 24) {
        // Convex profile IDs are usually 24 chars, adjust as needed
        try {
          const profile = await convexQueryWithAuth(req, api.users.getProfileOwnerById, {
            id: id as Id<"profiles">,
          } as any);
          if (profile) {
            userId = profile.userId;
            log("Found profile by ID", {
              profileId: id,
              userId: userId.toString(),
            });
          }
        } catch (profileError) {
          log("Profile not found by ID, trying user ID", {
            error: String(profileError),
          });
        }
      }

      // If no profile found by ID, try to get user by ID
      if (!userId) {
        try {
          const user = await convexQueryWithAuth(req, api.users.getProfileByUserIdPublic, {
            userId: id as Id<"users">,
          } as any);

          if (user) {
            userId = id as Id<"users">;
            log("Found user by ID", { userId: userId.toString() });
          }
        } catch (userError) {
          log("User not found by ID", { error: String(userError) });
        }
      }

      // If we still don't have a user ID, return 404
      if (!userId) {
        log("No user or profile found with ID", { id });
        return NextResponse.json(
          {
            error: "User or profile not found",
            requestId,
            details: "The provided ID does not match any user or profile",
          },
          { status: 404 }
        );
      }

      // Get profile images using the resolved user ID
      try {
        const resolvedUserId = userId as NonNullable<typeof userId> as Id<"users">; // assert non-null after prior 404 guard
        images = await convexQueryWithAuth(req, api.images.getProfileImages, {
          userId: resolvedUserId,
        } as any);
        if (!Array.isArray(images)) {
          throw new Error("Invalid response format from getProfileImages");
        }
        log("Fetched profile images", { count: images.length });
      } catch (queryError) {
        log("Error in getProfileImages query", {
          error: String(queryError),
          userId: userId.toString(),
        });
        throw new Error(
          `Failed to fetch images: ${queryError instanceof Error ? queryError.message : "Unknown error"}`
        );
      }
    } catch (error) {
      log("Error fetching profile images", { error: String(error) });
      return NextResponse.json(
        {
          error: "Failed to fetch profile images",
          requestId,
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    log("Request completed successfully", { duration: `${duration}ms` });

    return NextResponse.json(images, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "X-Request-ID": requestId,
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[${requestId}] Error in profile images API:`, {
      error: errorMessage,
      stack: errorStack,
      duration: `${duration}ms`,
      url: url.toString(),
    });

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        requestId,
        ...(debug
          ? {
              details: errorMessage,
              stack: errorStack,
            }
          : {}),
      },
      {
        status: 500,
        headers: {
          "X-Request-ID": requestId,
          "X-Response-Time": `${duration}ms`,
        },
      }
    );
  }
}
