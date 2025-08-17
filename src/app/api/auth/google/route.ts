import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getFirebaseUser } from "@/lib/firebaseAdmin";

export const POST = async (req: NextRequest) => {
  try {
    const { credential, state } = await req.json();
    if (!credential) {
      return new Response(JSON.stringify({ error: "Missing credential" }), {
        status: 400,
      });
    }
    // Verify the Google credential (Firebase ID token)
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(credential);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid Firebase ID token" }),
        { status: 401 }
      );
    }
    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("firebaseAuthToken", credential, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    // Optionally fetch user profile
    const userData = await getFirebaseUser(decoded.uid);
    return new Response(JSON.stringify({ success: true, user: userData }), {
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Google auth failed" }), {
      status: 500,
    });
  }
};
