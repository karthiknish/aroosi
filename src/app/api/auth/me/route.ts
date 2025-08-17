import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyFirebaseIdToken, getFirebaseUser } from "@/lib/firebaseAdmin";

// Return current user with profile using Firebase authentication
export async function GET(_request: Request) {
  try {
    // Get the Firebase ID token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("firebaseAuthToken")?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Verify the Firebase ID token
    const decodedToken = await verifyFirebaseIdToken(token);
    const userId = decodedToken.uid;

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Get the user data from Firestore
    const userData = await getFirebaseUser(userId);
    if (!userData) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

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
                isOnboardingComplete: Boolean(
                  userData.isOnboardingComplete ?? false
                ),
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