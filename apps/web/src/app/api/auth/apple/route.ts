import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db, adminAuth, COLLECTIONS, getFirebaseUser } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { createApiHandler, successResponse, errorResponse, ApiContext } from "@/lib/api/handler";

/**
 * POST /api/auth/apple
 * 
 * Mobile Apple Sign-In endpoint. After the mobile app signs in with Apple
 * and exchanges credentials with Firebase Auth, it calls this endpoint
 * to sync user data with the backend and set a session cookie.
 * 
 * Body: { uid, email, displayName, photoURL }
 */
export const POST = createApiHandler(async (ctx: ApiContext) => {
  const { request: req, correlationId } = ctx;
  try {
    const body = await req.json();
    const { uid, email, displayName, photoURL } = body || {};

    if (!uid) {
      return errorResponse("Missing uid", 400);
    }

    // Verify the user exists in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUser(uid);
    } catch (err) {
      return errorResponse("User not found in Firebase", 404);
    }

    // Create a custom token for the user to set a session cookie
    const customToken = await adminAuth.createCustomToken(uid);
    
    // Set session cookie with the UID
    const cookieStore = await cookies();
    const cookieDomain = process.env.COOKIE_BASE_DOMAIN?.trim();
    
    cookieStore.set("firebaseUserId", uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    // Ensure user exists in Firestore users collection
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const userDoc = await userRef.get();
    
    let userData = userDoc.data();

    if (!userDoc.exists) {
      // Create minimal user profile for new Apple sign-ins
      const initialData = {
        uid,
        email: email || firebaseUser.email || null,
        fullName: displayName || firebaseUser.displayName || "",
        photoURL: photoURL || firebaseUser.photoURL || null,
        provider: "apple",
        createdAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
        lastLoginAt: nowTimestamp(),
        loginCount: 1,
        emailVerified: true,
        onboardingComplete: false,
      };

      await userRef.set(initialData);
      userData = initialData;
    } else {
      // Update existing user
      const updateData = {
        lastLoginAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
        loginCount: (userData?.loginCount || 0) + 1,
      };
      await userRef.update(updateData);
      userData = { ...userData, ...updateData };
    }

    // Fetch complete user data
    const fullUserData = await getFirebaseUser(uid);

    return successResponse({ 
      success: true, 
      user: fullUserData,
      type: userDoc.exists ? 'updated' : 'created'
    });
  } catch (err) {
    console.error("Apple auth error:", err);
    return errorResponse("Apple auth failed", 500);
  }
});
