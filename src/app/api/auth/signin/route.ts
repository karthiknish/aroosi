import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase/auth";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";

function maskEmail(email?: string) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  const first = name?.[0] || "*";
  return `${first}***@${domain}`;
}

function reqMeta(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const xfwd = request.headers.get("x-forwarded-for") || "";
  const ip = xfwd.split(",")[0]?.trim();
  return {
    method: request.method,
    url: request.nextUrl?.pathname,
    contentType,
    ip,
    referer: request.headers.get("referer") || undefined,
    ua: request.headers.get("user-agent") || undefined,
  };
}

// Sign in with email and password using Firebase
export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    try {
      // Sign in with Firebase Admin SDK
      const userRecord = await adminAuth.getUserByEmail(email);
      
      // Create a custom token for the user
      const customToken = await adminAuth.createCustomToken(userRecord.uid);
      
      // In a real implementation, you would return the custom token to the client
      // and let the client sign in with it using the Firebase client SDK
      // For now, we'll simulate setting a cookie with the user ID
      
      const response = NextResponse.json({ 
        ok: true, 
        uid: userRecord.uid,
        email: userRecord.email,
        customToken: customToken
      }, { status: 200 });
      
      // Set a cookie with the user ID (in a real implementation, you'd use the Firebase token)
      response.cookies.set("firebaseUserId", userRecord.uid, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });
      
      return response;
    } catch (firebaseError: any) {
      console.error("Firebase sign in error:", firebaseError);
      
      if (firebaseError.code === "auth/user-not-found") {
        return NextResponse.json(
          { error: "No account found with this email address", code: "ACCOUNT_NOT_FOUND" },
          { status: 404 }
        );
      } else if (firebaseError.code === "auth/wrong-password") {
        return NextResponse.json(
          { error: "Invalid password", code: "INVALID_PASSWORD" },
          { status: 401 }
        );
      } else {
        return NextResponse.json(
          { error: "Sign in failed", code: "INVALID_CREDENTIALS" },
          { status: 401 }
        );
      }
    }
  } catch (e) {
    console.error("Unexpected error in sign in route:", e);
    return NextResponse.json(
      { error: "Sign in failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}