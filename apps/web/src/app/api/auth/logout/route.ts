import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/handler";

// Logout user by clearing Firebase auth cookies
export async function POST(_request: NextRequest) {
  try {
    const response = successResponse({ ok: true });
    
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
    return errorResponse("Logout failed", 500, { code: "UNKNOWN" });
  }
}