import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebaseAdmin";
// import { getAuth } from "firebase/auth"; // not needed directly here

// Return current user with profile using Firebase authentication
export async function GET(_request: Request) {
  try {
    // Get the user ID from the Firebase auth token in cookies
    // In a real implementation, you would verify the Firebase token here
    // For now, we'll simulate getting the user ID from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("firebaseAuthToken");

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // In a real implementation, you would verify the token and extract the user ID
    // For now, we'll simulate this
    const userId = cookieStore.get("firebaseUserId")?.value;

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Get the user data from Firestore (admin SDK)
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const userData = userDoc.data() || {};

    // Return user data with profile
    return NextResponse.json(
      {
        user: {
          id: userId,
          email: userData.email || "",
          role: userData.role || "user",
          emailVerified: userData.emailVerified || false,
          createdAt: userData.createdAt || Date.now(),
          fullName: userData.fullName || userData.displayName || undefined,
          profile: userData
            ? {
                id: userId,
                fullName: userData.fullName || undefined,
                isProfileComplete: Boolean(userData.isProfileComplete ?? false),
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
