import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

// Add debug logging
const debug = process.env.NODE_ENV === 'development';

function getTokenFromRequest(req: NextRequest): string | null {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      if (debug) {
        console.log("[API] No authorization header found");
      }
      return null;
    }
    const [type, token] = auth.split(" ");
    if (type !== "Bearer" || !token) {
      if (debug) {
        console.log("[API] Invalid authorization format or missing token");
      }
      return null;
    }
    return token;
  } catch (error) {
    console.error("[API] Error in getTokenFromRequest:", error);
    return null;
  }
}

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

    // Use the token from the Authorization header
    const token = getTokenFromRequest(req);
    if (!token) {
      log("No valid token found");
      return NextResponse.json(
        { error: "Authorization token is required", requestId },
        { status: 401 }
      );
    }

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

    log("Initializing Convex client");
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      const error = "Convex URL is not configured";
      log(error);
      return NextResponse.json({ error, requestId }, { status: 500 });
    }

    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(token);

    log("Fetching profile details", { profileId: id });

    let userId: Id<"users"> | null = null;
    let images: unknown[] = [];

    try {
      // First try to get the profile by ID
      try {
        const profile = await convex.query(api.users.getProfileById, {
          id: id as Id<"profiles">,
        });

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

      // If no profile found by ID, try to get user by ID
      if (!userId) {
        try {
          const user = await convex.query(api.users.getUserPublicProfile, {
            userId: id as Id<"users">,
          });

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
        images = await convex.query(api.images.getProfileImages, { userId });
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
