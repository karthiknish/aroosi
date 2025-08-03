import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { signAccessJWT, signRefreshJWT } from "@/lib/auth/jwt";

const profileSchema = z
  .object({
    // Align with Convex createUserAndProfileViaSignup profile shape
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

    profileFor: z
      .enum([
        "self",
        "son",
        "daughter",
        "brother",
        "sister",
        "friend",
        "relative",
        "",
      ])
      .optional(),
    country: z.string().optional(),
    annualIncome: z.union([z.string(), z.number()]).optional(),
    email: z.string().email().optional(),
    profileImageIds: z.array(z.string()).optional(),
    isProfileComplete: z.boolean().optional(),
    preferredGender: z.enum(["male", "female", "other", "any"]).optional(),
    motherTongue: z
      .enum([
        "farsi-dari",
        "pashto",
        "uzbeki",
        "hazaragi",
        "turkmeni",
        "balochi",
        "nuristani",
        "punjabi",
        "",
      ])
      .optional(),
    religion: z.enum(["muslim", "hindu", "sikh", ""]).optional(),
    ethnicity: z
      .enum([
        "tajik",
        "pashtun",
        "uzbek",
        "hazara",
        "turkmen",
        "baloch",
        "nuristani",
        "aimaq",
        "pashai",
        "qizilbash",
        "punjabi",
        "",
      ])
      .optional(),
    diet: z
      .enum([
        "vegetarian",
        "non-vegetarian",
        "halal",
        "vegan",
        "eggetarian",
        "other",
        "",
      ])
      .optional(),
    physicalStatus: z.enum(["normal", "differently-abled", ""]).optional(),
    smoking: z.enum(["no", "occasionally", "yes", ""]).optional(),
    drinking: z.enum(["no", "occasionally", "yes"]).optional(),
    partnerPreferenceAgeMin: z.number().optional(),
    partnerPreferenceAgeMax: z.number().optional(),
    partnerPreferenceCity: z.array(z.string()).optional(),
    subscriptionPlan: z.enum(["free", "premium", "premiumPlus"]).optional(),
  })
  .refine(
    (p) =>
      !!p.fullName &&
      !!p.dateOfBirth &&
      !!p.gender &&
      !!p.city &&
      !!p.aboutMe &&
      !!p.occupation &&
      !!p.education &&
      !!p.height &&
      !!p.maritalStatus &&
      !!p.phoneNumber,
    { message: "Incomplete profile payload" }
  );

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  profile: profileSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, profile } = signupSchema.parse(body);

    // Enforce profile completeness check
    const requiredProfileKeys: Array<keyof typeof profile> = [
      "fullName",
      "dateOfBirth",
      "gender",
      "city",
      "aboutMe",
      "occupation",
      "education",
      "height",
      "maritalStatus",
      "phoneNumber",
    ];
    const missing = requiredProfileKeys.filter((k) => {
      const v = (profile as any)[k];
      return (
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "")
      );
    });
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Profile incomplete. User will not be created.",
          details: missing,
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create Convex HTTP client
    const convex = getConvexClient();
    if (!convex) {
      return NextResponse.json(
        {
          error: "Convex client not configured",
          hint: "Set NEXT_PUBLIC_CONVEX_URL in environment.",
        },
        { status: 500 }
      );
    }

    // Check for existing user
    const existing = await convex.query(api.users.getUserByEmail, {
      email: normalizedEmail,
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account already exists with this email." },
        { status: 409 }
      );
    }

    // Normalize profile payload
    const normalizedProfile = {
      ...profile,
      email: profile.email ?? normalizedEmail,
      isProfileComplete: true,
      height:
        typeof profile.height === "string"
          ? profile.height
          : String(profile.height ?? ""),
      annualIncome:
        typeof profile.annualIncome === "number"
          ? profile.annualIncome
          : typeof profile.annualIncome === "string"
            ? profile.annualIncome
            : undefined,
      partnerPreferenceCity: Array.isArray(profile.partnerPreferenceCity)
        ? profile.partnerPreferenceCity
        : [],
      profileImageIds: Array.isArray(profile.profileImageIds)
        ? profile.profileImageIds
        : [],
    };

    // Create user and profile atomically
    const result = await convex.action(
      api.users.createUserAndProfileViaSignup,
      {
        email: normalizedEmail,
        hashedPassword,
        fullName,
        profile: normalizedProfile,
      }
    );

    const userIdOk = !!result?.userId;
    const profileIdOk = !!result?.profileId;

    if (!userIdOk) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Generate JWT tokens (same as sign-in)
    const accessToken = await signAccessJWT({
      userId: result.userId.toString(),
      email: normalizedEmail,
      role: "user",
    });
    const refreshToken = await signRefreshJWT({
      userId: result.userId.toString(),
      email: normalizedEmail,
      role: "user",
    });

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      message: "Account created successfully",
      token: accessToken, // Include token in response body for AuthProvider
      user: {
        id: result.userId,
        email: normalizedEmail,
        role: "user",
      },
      userId: result.userId,
      profileId: result.profileId,
      createdProfile: profileIdOk,
      redirectTo: "/success",
    });

    // Set cookies (exactly like sign-in API)
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
    console.error("Signup error:", error);
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
