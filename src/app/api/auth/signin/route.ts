import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signJWT } from "@/lib/auth/jwt";
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

    // Get user by email
    const user = await fetchQuery(api.auth.getUserByEmail, { email });
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
      },
    });
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
