import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyFirebaseIdToken, getFirebaseUser, db } from "@/lib/firebaseAdmin";

// Return current user with profile using Firebase authentication (cookie first, bearer header fallback)
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    let token: string | null | undefined =
      cookieStore.get("firebaseAuthToken")?.value;

    // Authorization: Bearer <token> fallback (mirrors requireSession logic)
    if (!token) {
      const authz =
        request.headers.get("authorization") ||
        request.headers.get("Authorization");
      if (authz && authz.toLowerCase().startsWith("bearer ")) {
        token = authz.slice(7).trim() || null;
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.info("[/api/auth/me] Using bearer header fallback");
        }
      }
    }

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const decodedToken = await verifyFirebaseIdToken(token);
    const userId = decodedToken.uid;
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    let userData = await getFirebaseUser(userId);
    // Auto-provision a minimal user document if missing (fixes 401 on first Google auth before profile upsert completes)
    if (!userData) {
      const now = Date.now();
      const email = (decodedToken as any).email || "";
      const fullName = (decodedToken as any).name || (decodedToken as any).displayName || undefined;
      await db.collection("users").doc(userId).set(
        {
          email: email.toLowerCase(),
          createdAt: now,
            updatedAt: now,
          fullName,
          isOnboardingComplete: false,
          role: "user",
        },
        { merge: true }
      );
      userData = await getFirebaseUser(userId);
    }

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
    // On unexpected failures, mask with 401 to encourage client retry rather than caching null success
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("Error in /api/auth/me:", error);
    }
    return NextResponse.json({ user: null }, { status: 401 });
  }
}