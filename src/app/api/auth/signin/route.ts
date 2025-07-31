import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signAccessJWT, signRefreshJWT } from "@/lib/auth/jwt";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = signinSchema.parse(body);

    // Get user by email (normalize to lower-case)
    const normalizedEmail = email.toLowerCase().trim();
    const user = await fetchQuery(api.users.getUserByEmail, { email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Check if account is banned
    if (user.banned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    // Verify password
    if (!user.hashedPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Generate access & refresh tokens
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

    // Issue HttpOnly cookies so middleware can authenticate protected routes
    const response = NextResponse.json({
      message: "Signed in successfully",
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      redirectTo: "/search",
    });

    // Compute secure cookie attributes based on environment
    const isProd = process.env.NODE_ENV === "production";
    const baseCookieAttrs = `Path=/; HttpOnly; SameSite=Lax; Max-Age=`;
    const secureAttr = isProd ? "; Secure" : "";

    // Set access token cookie (short-lived) - 15 minutes
    response.headers.set(
      "Set-Cookie",
      `auth-token=${accessToken}; ${baseCookieAttrs}${60 * 15}${secureAttr}`
    );
    // Append refresh token cookie (7 days)
    response.headers.append(
      "Set-Cookie",
      `refresh-token=${refreshToken}; ${baseCookieAttrs}${60 * 60 * 24 * 7}${secureAttr}`
    );

    // Optional compatibility cookie (non-HttpOnly) for legacy code (access token only)
    response.headers.append(
      "Set-Cookie",
      `authTokenPublic=${accessToken}; Path=/; SameSite=Lax; Max-Age=${60 * 15}${secureAttr}`
    );

    return response;
  } catch (error) {
    console.error("Signin error:", error);
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
