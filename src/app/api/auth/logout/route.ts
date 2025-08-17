import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Logout user by clearing Firebase auth cookies
export async function POST(_request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true }, { status: 200 });
    
    // Clear the Firebase auth cookies
    response.cookies.set("firebaseAuthToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0, // Expire immediately
      path: "/",
    });
    
    response.cookies.set("firebaseUserId", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0, // Expire immediately
      path: "/",
    });
    
    return response;
  } catch (e) {
    console.error("Unexpected error in logout route:", e);
    return NextResponse.json(
      { error: "Logout failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}