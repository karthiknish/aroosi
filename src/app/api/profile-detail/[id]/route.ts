import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

/**
 * Extracts and validates the JWT token from the request headers
 */
function getTokenFromRequest(req: NextRequest): { token: string | null; error?: string } {
  try {
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      console.log('No Authorization header found');
      return { token: null, error: 'No authorization header' };
    }

    const [type, token] = authHeader.split(" ");
    
    if (type !== "Bearer") {
      console.log('Invalid token type. Expected Bearer token');
      return { token: null, error: 'Invalid token type' };
    }
    
    if (!token) {
      console.log('No token provided after Bearer');
      return { token: null, error: 'No token provided' };
    }
    
    console.log('Token extracted successfully');
    return { token };
    
  } catch (error) {
    console.error('Error extracting token:', error);
    return { 
      token: null, 
      error: error instanceof Error ? error.message : 'Failed to process token' 
    };
  }
}

export async function GET(req: NextRequest) {
  console.log('\n--- Profile Detail API Request ---');
  
  try {
    // Extract and validate token
    const { token, error: tokenError } = getTokenFromRequest(req);
    
    if (!token) {
      console.error('Authentication failed:', tokenError);
      return NextResponse.json(
        { 
          error: "Authentication failed",
          details: tokenError || 'Invalid or missing token',
          timestamp: new Date().toISOString()
        }, 
        { status: 401 }
      );
    }
    
    console.log('Token validated. Initializing Convex client...');
    
    // Initialize Convex client
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      console.error('Convex URL is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    
    try {
      // Set the auth token
      console.log('Setting auth token on Convex client...');
      convex.setAuth(token);
      
      // Get the user ID from the URL
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();
      
      console.log('Request URL:', req.url);
      console.log('Extracted ID:', id);
      
      if (!id) {
        console.error('No user ID provided in the URL');
        return NextResponse.json(
          { 
            error: "User ID is required",
            details: 'The user ID is missing from the URL',
            path: url.pathname
          },
          { status: 400 }
        );
      }
      
      const viewedUserId = id as Id<"users">;
      
      console.log('Fetching profile data for user:', viewedUserId);
      
      try {
        const result = await convex.action(api.users.getProfileDetailPageData, {
          viewedUserId,
        });
        
        console.log('Profile data fetched successfully');
        
        // Only return text/profile data, not images
        const {
          currentUser,
          profileData,
          isBlocked = false,
          isMutualInterest = false,
          sentInterest = [],
          error,
        } = result;
        
        console.log('Sending response with profile data');
        
        const responseData = {
          success: true,
          currentUser: currentUser || null,
          profileData: profileData || null,
          isBlocked: Boolean(isBlocked),
          isMutualInterest: Boolean(isMutualInterest),
          sentInterest: Array.isArray(sentInterest) ? sentInterest : [],
          ...(error ? { error } : {}),
          timestamp: new Date().toISOString()
        };
        
        return NextResponse.json(
          responseData,
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            },
          }
        );
        
      } catch (actionError) {
        console.error('Error in Convex action:', actionError);
        
        // Check if this is a known error from Convex
        const errorMessage = actionError instanceof Error ? actionError.message : 'Unknown error';
        const isAuthError = errorMessage.includes('Unauthenticated') || 
                          errorMessage.includes('token') || 
                          errorMessage.includes('authentication');
        
        return NextResponse.json(
          { 
            error: isAuthError ? 'Authentication failed' : 'Failed to fetch profile data',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
            code: isAuthError ? 'AUTH_ERROR' : 'API_ERROR',
            timestamp: new Date().toISOString()
          },
          { 
            status: isAuthError ? 401 : 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
    } catch (convexError) {
      console.error('Convex client error:', convexError);
      
      return NextResponse.json(
        { 
          error: "Failed to process request",
          details: process.env.NODE_ENV === 'development' ? 
                  (convexError instanceof Error ? convexError.message : String(convexError)) : 
                  undefined,
          code: 'CLIENT_ERROR',
          timestamp: new Date().toISOString()
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    console.error('Unexpected error in profile detail API:', error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? 
                (error instanceof Error ? error.message : String(error)) : 
                'Please check the server logs',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
