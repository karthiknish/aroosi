import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, getFirebaseUser, db } from "@/lib/firebaseAdmin";

/**
 * POST /api/auth/apple
 * 
 * Mobile Apple Sign-In endpoint. After the mobile app signs in with Apple
 * and exchanges credentials with Firebase Auth, it calls this endpoint
 * to sync user data with the backend and set a session cookie.
 * 
 * Body: { uid, email, displayName, photoURL }
 */
export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { uid, email, displayName, photoURL } = body || {};

    if (!uid) {
      return new Response(JSON.stringify({ error: "Missing uid" }), {
        status: 400,
      });
    }

    // Verify the user exists in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUser(uid);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "User not found in Firebase" }),
        { status: 404 }
      );
    }

    // Create a custom token for the user to set a session cookie
    const customToken = await adminAuth.createCustomToken(uid);
    
    // Exchange custom token for an ID token isn't possible server-side,
    // so we'll set the UID directly as the session identifier
    // and rely on the mobile app's Firebase Auth state
    
    // Set session cookie with the UID
    const cookieStore = await cookies();
    const cookieDomain = process.env.COOKIE_BASE_DOMAIN?.trim();
    
    // For mobile apps, we use a simpler session approach
    // The mobile app manages its own Firebase Auth state
    cookieStore.set("firebaseUserId", uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    // Ensure user exists in Firestore users collection
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create minimal user profile for new Apple sign-ins
      await userRef.set({
        uid,
        email: email || firebaseUser.email || null,
        fullName: displayName || firebaseUser.displayName || "",
        photoURL: photoURL || firebaseUser.photoURL || null,
        provider: "apple",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
    } else {
      // Update last sign-in time
      await userRef.set({
        lastLoginAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
    }

    // Fetch complete user data
    const userData = await getFirebaseUser(uid);

    return new Response(JSON.stringify({ success: true, user: userData }), {
      status: 200,
    });
  } catch (err) {
    console.error("Apple auth error:", err);
    return new Response(JSON.stringify({ error: "Apple auth failed" }), {
      status: 500,
    });
  }
};
