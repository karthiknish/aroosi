import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";

/**
 * Native signup (no OTP):
 * - Validates input
 * - Hashes password
 * - Upserts user in Convex via users.createUserViaSignup action (wraps internalUpsertUser)
 * - Optionally creates a full profile in the same step if profile payload is provided
 * - Returns success so the frontend can proceed with onboarding and profile creation
 */

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
    profileImageIds: z.array(z.string()).optional(), // Convex Id<_storage> as strings
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
  // Require a minimal viable set to ensure profile is inserted on signup
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
  // Switch to single fullName semantics and drop first/last names
  fullName: z.string().min(1),
  profile: profileSchema, // require profile for atomic user+profile creation
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, profile } = signupSchema.parse(body);

    // Enforce: do NOT create the user unless ALL required profile fields are present and non-empty
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

    // 1) Duplicate email pre-check (Convex) → return 409 Conflict if user exists
    const existing = await convex.query(api.users.getUserByEmail, {
      email: normalizedEmail,
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account already exists with this email." },
        { status: 409 }
      );
    }

    // 2) Normalize/prepare profile payload for Convex
    const normalizedProfile = {
      ...profile,
      email: profile.email ?? normalizedEmail,
      // Force profile to be marked complete
      isProfileComplete: true,
      // Ensure height is a string; server handles further normalization
      height:
        typeof profile.height === "string"
          ? profile.height
          : String(profile.height ?? ""),
      // Allow string or number income, Convex will parse to number
      annualIncome:
        typeof profile.annualIncome === "number"
          ? profile.annualIncome
          : typeof profile.annualIncome === "string"
            ? profile.annualIncome
            : undefined,
      // Ensure arrays are arrays
      partnerPreferenceCity: Array.isArray(profile.partnerPreferenceCity)
        ? profile.partnerPreferenceCity
        : [],
      profileImageIds: Array.isArray(profile.profileImageIds)
        ? profile.profileImageIds
        : [],
    };

    // 3) Atomic user + profile creation via Convex action
    const result = await convex.action(
      api.users.createUserAndProfileViaSignup,
      {
        email: normalizedEmail,
        hashedPassword,
        fullName,
        profile: normalizedProfile,
      }
    );

    // Defensive: verify both user and profile creation results
    const userIdOk = !!result?.userId;
    const profileIdOk = !!result?.profileId;

    // Create a server session for the user after successful signup so the client is logged in.
    // We issue a signed HttpOnly cookie that your AuthProvider should read to authenticate requests.
    try {
      const sessionPayload = {
        email: normalizedEmail,
        userId: result?.userId ?? null,
        issuedAt: Date.now(),
      };
      // Minimal signing using a simple base64 for demo; replace with real signing/JWT in production.
      const value = Buffer.from(JSON.stringify(sessionPayload)).toString(
        "base64url"
      );
      const cookie = `aroosi_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
      const response = NextResponse.json(
        {
          success: userIdOk && !!normalizedProfile,
          userId: result?.userId ?? null,
          profileId: result?.profileId ?? null,
          createdProfile: profileIdOk,
          // Instruct client where to redirect next
          redirectTo: "/success",
        },
        { status: userIdOk ? 200 : 500 }
      );
      response.headers.set("Set-Cookie", cookie);
      return response;
    } catch (e) {
      // If session cookie fails, still return success and let client call /api/auth/login
      return NextResponse.json(
        {
          success: userIdOk && !!normalizedProfile,
          userId: result?.userId ?? null,
          profileId: result?.profileId ?? null,
          createdProfile: profileIdOk,
          redirectTo: "/success",
        },
        { status: userIdOk ? 200 : 500 }
      );
    }
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
