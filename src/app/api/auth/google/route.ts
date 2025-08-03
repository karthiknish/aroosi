import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { signAccessJWT, signRefreshJWT } from "@/lib/auth/jwt";
import { sendWelcomeEmail } from "@/lib/auth/email";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const googleAuthSchema = z.object({
  credential: z.string(), // Google user info JSON or ID token
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = googleAuthSchema.parse(body);

    let payload: any;
    let googleId: string;
    let email: string;
    let name: string;
    let given_name: string;
    let family_name: string;
    let email_verified: boolean;

    try {
      // Try to parse as user info JSON first (new popup method)
      const userInfo = JSON.parse(credential);
      if (userInfo.email && userInfo.verified_email !== undefined) {
        payload = userInfo;
        // googleId = userInfo.id || userInfo.email; // Use email as fallback ID
        googleId = userInfo.id;

        if (!googleId) {
          throw new Error("Missing Google ID");
        }

        email = userInfo.email;
        name = userInfo.name;
        given_name = userInfo.given_name;
        family_name = userInfo.family_name;
        email_verified = userInfo.verified_email;
      } else {
        throw new Error("Not user info format");
      }
    } catch {
      // Fallback to ID token verification (original method)
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      payload = ticket.getPayload();
      if (!payload) {
        return NextResponse.json(
          { error: "Invalid Google token" },
          { status: 400 }
        );
      }

      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      given_name = payload.given_name;
      family_name = payload.family_name;
      email_verified = payload.email_verified;
    }

    if (!email || !email_verified) {
      return NextResponse.json(
        { error: "Email not verified with Google" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user: any;
    let isNewUser = false;

    // Check if user already exists by email
    user = await fetchQuery(api.users.getUserByEmail, {
      email: normalizedEmail,
    });

    if (user) {
      // User exists, check if they have Google ID
      if (!user.googleId) {
        // Link Google account to existing user
        await fetchMutation(api.auth.linkGoogleAccount, {
          userId: user._id,
          googleId,
        });
        user = { ...user, googleId };
      }
    } else {
      // Create new user with Google account
      isNewUser = true;
      const userId = await fetchMutation(api.auth.createGoogleUser, {
        email: normalizedEmail,
        googleId,
        firstName: given_name || "",
        lastName: family_name || "",
        name: name || "",
      });

      // Get the created user from database
      user = await fetchQuery(api.users.getUserByEmail, {
        email: normalizedEmail,
      });

      // Send welcome email for new users
      try {
        await sendWelcomeEmail(normalizedEmail, name || "User");
      } catch (emailError) {
        console.warn("Failed to send welcome email:", emailError);
        // Don't fail the auth flow for email issues
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Check if account is banned
    if (user.banned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    // Generate access & refresh tokens (same as signin/signup)
    const accessToken = await signAccessJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || "user",
    });
    const refreshToken = await signRefreshJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || "user",
    });

    // Create response with consistent structure
    const response = NextResponse.json({
      message: isNewUser
        ? "Account created successfully"
        : "Signed in successfully",
      token: accessToken, // Include token in response body for AuthProvider
      user: {
        id: user._id,
        email: user.email,
        role: user.role || "user",
        name: name || "",
      },
      isNewUser,
      // Redirect based on whether user needs to complete profile
      redirectTo: isNewUser ? "/profile/create" : "/search",
    });

    // Set cookies (exactly like signin/signup APIs)
    const isProd = process.env.NODE_ENV === "production";
    const baseCookieAttrs = `Path=/; HttpOnly; SameSite=Lax; Max-Age=`;
    const secureAttr = isProd ? "; Secure" : "";

    // Set access token cookie (15 minutes)
    response.headers.set(
      "Set-Cookie",
      `auth-token=${accessToken}; ${baseCookieAttrs}${60 * 15}${secureAttr}`
    );

    // Append refresh token cookie (7 days)
    response.headers.append(
      "Set-Cookie",
      `refresh-token=${refreshToken}; ${baseCookieAttrs}${60 * 60 * 24 * 7}${secureAttr}`
    );

    // Append public token cookie for legacy compatibility
    response.headers.append(
      "Set-Cookie",
      `authTokenPublic=${accessToken}; Path=/; SameSite=Lax; Max-Age=${60 * 15}${secureAttr}`
    );

    return response;
  } catch (error) {
    console.error("Google auth error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
