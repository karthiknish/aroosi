import { NextRequest, NextResponse } from "next/server";
import { adminAuth, db, COLLECTIONS } from "@/lib/firebaseAdmin";

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

// Sign up with email and password using Firebase
export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = (await request
      .json()
      .catch(() => ({}))) as {
      email?: string;
      password?: string;
      fullName?: string;
    };
    const suppressWelcome = request.headers.get("x-suppress-welcome") === "1";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    try {
      // Create user with Firebase Admin SDK
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: fullName,
      });

      // Create a custom token for the user
      const customToken = await adminAuth.createCustomToken(userRecord.uid);

      // Queue welcome email task (or mark suppressed)
      if (userRecord.email) {
        if (suppressWelcome) {
          try {
            await db
              .collection(COLLECTIONS.USERS)
              .doc(userRecord.uid)
              .set(
                { welcomeEmailSentAt: Date.now(), updatedAt: Date.now() },
                { merge: true }
              );
          } catch (e) {
            console.warn("Failed to mark welcomeEmailSentAt (suppressed)", {
              uid: userRecord.uid,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        } else {
          try {
            await db.collection(COLLECTIONS.TASKS).add({
              type: "send_welcome_email",
              userId: userRecord.uid,
              email: userRecord.email,
              name: fullName || userRecord.displayName || "there",
              attempt: 0,
              status: "pending",
              createdAt: Date.now(),
              processAfter: Date.now(),
            });
          } catch (e) {
            console.warn("Failed to enqueue welcome email task", {
              uid: userRecord.uid,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
      }

      const response = NextResponse.json(
        {
          ok: true,
          uid: userRecord.uid,
          email: userRecord.email,
          customToken: customToken,
          welcomeEmailQueued: Boolean(userRecord.email) && !suppressWelcome,
          welcomeEmailSuppressed: suppressWelcome,
        },
        { status: 200 }
      );

      // Set a cookie with the user ID (in a real implementation, you'd use the Firebase token)
      response.cookies.set("firebaseUserId", userRecord.uid, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      return response;
    } catch (firebaseError: any) {
      console.error("Firebase sign up error:", firebaseError);

      if (firebaseError.code === "auth/email-already-exists") {
        return NextResponse.json(
          {
            error: "An account with this email already exists",
            code: "EMAIL_EXISTS",
          },
          { status: 409 }
        );
      } else if (firebaseError.code === "auth/invalid-password") {
        return NextResponse.json(
          {
            error: "Password must be at least 6 characters",
            code: "INVALID_PASSWORD",
          },
          { status: 400 }
        );
      } else if (firebaseError.code === "auth/invalid-email") {
        return NextResponse.json(
          { error: "Invalid email address", code: "INVALID_EMAIL" },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: "Sign up failed", code: "UNKNOWN" },
          { status: 500 }
        );
      }
    }
  } catch (e) {
    console.error("Unexpected error in sign up route:", e);
    return NextResponse.json(
      { error: "Sign up failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}