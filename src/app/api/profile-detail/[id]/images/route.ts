import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

function getTokenFromRequest(req: NextRequest): string | null {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      console.log('No authorization header found');
      return null;
    }
    const [type, token] = auth.split(" ");
    if (type !== "Bearer" || !token) {
      console.log('Invalid authorization format or missing token');
      return null;
    }
    return token;
  } catch (error) {
    console.error('Error in getTokenFromRequest:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get and validate the token
    const token = getTokenFromRequest(req);
    console.log('Token received in images endpoint:', token ? '[token exists]' : 'no token');
    
    if (!token) {
      return NextResponse.json(
        { error: "Authentication token is missing or invalid" }, 
        { status: 401 }
      );
    }

    // Get the user ID from the URL
    const url = new URL(req.url);
    const segments = url.pathname.split("/");
    let id = segments[segments.length - 2];
    if (id === "images") {
      id = segments[segments.length - 3];
    }
    
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    try {
      convex.setAuth(token);
      const viewedUserId = id as Id<"users">;
      
      console.log('Fetching images for user:', viewedUserId);
      
      const result = await convex.action(api.users.getProfileDetailPageData, {
        viewedUserId,
      });
      
      console.log('Successfully fetched images for user:', viewedUserId);
      
      // Only return image-related fields
      const { userProfileImages, userImages, currentUserProfileImagesData, error } = result;
      
      return NextResponse.json(
        {
          userProfileImages: userProfileImages || [],
          userImages: userImages || {},
          currentUserProfileImagesData: currentUserProfileImagesData || [],
          ...(error ? { error } : {}),
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        }
      );
      
    } catch (convexError) {
      console.error('Convex API error when fetching images:', convexError);
      return NextResponse.json(
        { 
          error: "Failed to fetch profile images",
          details: process.env.NODE_ENV === 'development' ? (convexError as Error).message : undefined
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Unexpected error in profile images API:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
