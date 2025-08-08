import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

// Simple profile schema for validation
const profileSchema = z.object({
  fullName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  gender: z.enum(["male", "female", "other"]),
  city: z.string().min(1),
  aboutMe: z.string().min(1),
  occupation: z.string().min(1),
  education: z.string().min(1),
  height: z.string().min(1),
  maritalStatus: z.enum(["single", "divorced", "widowed", "annulled"]),
  phoneNumber: z.string().min(1),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  profile: profileSchema,
});

export async function POST(request: NextRequest) {
  try {
    console.log("Signup route called");
    
    // Parse request body
    const body = await request.json();
    console.log("Request body:", body);
    
    // Validate input
    const parsed = signupSchema.parse(body);
    const { email, password, fullName, profile } = parsed;
    
    console.log("Validation passed for:", { email, fullName });
    
    // Check password strength (simplified)
    const strongPolicy =
      password.length >= 12 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
      
    if (!strongPolicy) {
      return NextResponse.json(
        {
          error: "Password does not meet security requirements",
        },
        { status: 400 }
      );
    }
    
    // Create Convex client
    const convex = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL!
    );
    
    console.log("Convex client created");
    
    // Call the signIn action directly for signup
    let result;
    try {
      result = await convex.action(api.auth.signIn, {
        provider: "password",
        params: {
          email,
          password,
          flow: "signUp",
        },
      });
      console.log("Sign up result:", result);
    } catch (error: any) {
      console.error("SignUp error:", error);
      return NextResponse.json(
        { error: "Unable to create account. Please try again." },
        { status: 400 }
      );
    }
    
    // Check if the sign up was successful
    if (!result?.tokens?.token) {
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }
    
    // Ensure a user+profile exists in our domain data
    let createdUserId: string | null = null;
    try {
      const existing = await convex.query(api.users.findUserByEmail, {
        email,
      });
      console.log("Existing user check:", existing);
      
      if (!existing) {
        createdUserId = await convex.mutation(api.users.createUserAndProfile, {
          email,
          name: fullName,
          picture: undefined,
          googleId: undefined,
        });
        console.log("Created user with ID:", createdUserId);
      } else {
        createdUserId = String(existing._id);
      }
    } catch (e) {
      console.error("Error creating user:", e);
    }
    
    // Create response with session cookie
    const res = NextResponse.json(
      {
        status: "success",
        message: "Account created successfully",
        user: {
          id: createdUserId,
          email,
          role: "user",
        },
        isNewUser: true,
        redirectTo: "/success",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
    
    // Set the session cookie
    res.cookies.set("convex-session", result.tokens.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
      sameSite: "lax",
    });
    
    return res;
  } catch (error: any) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "Unable to complete signup at this time" },
      { status: 500 }
    );
  }
}