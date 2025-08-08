import { NextRequest, NextResponse } from "next/server";

// Handler for Google OAuth initiation
export async function GET(request: NextRequest) {
  try {
    // Get the redirect URL from environment variables or fallback to default
    const redirectUrl = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/callback`;
    
    // Generate a state parameter for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store state in a cookie for verification later
    const response = NextResponse.redirect(
      `${request.nextUrl.origin}/api/auth/signin/google?state=${state}`,
      { status: 302 }
    );
    
    // Set state cookie with 10-minute expiration
    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
      sameSite: "lax",
    });
    
    return response;
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google sign in" },
      { status: 500 }
    );
  }
}

// Handler for receiving Google OAuth callback data
export async function POST(request: NextRequest) {
  try {
    const { credential, state } = await request.json();
    
    // Verify state parameter
    const storedState = request.cookies.get("oauth_state")?.value;
    if (!state || state !== storedState) {
      return NextResponse.json(
        { error: "Invalid OAuth state" },
        { status: 400 }
      );
    }
    
    // Clear the state cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete("oauth_state");
    
    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.json(
      { error: "Failed to process Google sign in" },
      { status: 500 }
    );
  }
}