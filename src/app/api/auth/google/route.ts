import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { signJWT } from "@/lib/auth/jwt";
import { sendWelcomeEmail } from "@/lib/auth/email";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

const googleAuthSchema = z.object({
  credential: z.string(), // Google ID token
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = googleAuthSchema.parse(body);

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid Google token" },
        { status: 400 },
      );
    }

    const {
      sub: googleId,
      email,
      name,
      given_name,
      family_name,
      email_verified,
    } = payload;

    if (!email || !email_verified) {
      return NextResponse.json(
        { error: "Email not verified with Google" },
        { status: 400 },
      );
    }

    // Check if user already exists by email
    let user = await fetchQuery(api.auth.getUserByEmail, { email });

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
      const userId = await fetchMutation(api.auth.createGoogleUser, {
        email,
        googleId,
        firstName: given_name || "",
        lastName: family_name || "",
        name: name || "",
      });

      // Get the created user from database
      user = await fetchQuery(
        api.auth.getUserByEmail,
        { email },
        { token: "" },
      );

      // Send welcome email
      await sendWelcomeEmail(email, name || "User");
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    // Check if account is banned
    if (user.banned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    // Generate JWT token
    const token = await signJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || "user",
    });

    return NextResponse.json({
      message: "Signed in successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: name || "",
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
