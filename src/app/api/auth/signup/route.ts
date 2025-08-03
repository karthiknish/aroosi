import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { signAccessJWT, signRefreshJWT } from "@/lib/auth/jwt";

/**
 * Utility: normalize Gmail for comparison-only throttling
 */
const normalizeGmailForCompare = (e: string) => {
  const [local, domain] = e.split("@");
  if (!local || !domain) return e.toLowerCase().trim();
  const d = domain.toLowerCase();
  if (d === "gmail.com" || d === "googlemail.com") {
    const plusIdx = local.indexOf("+");
    const base = (plusIdx === -1 ? local : local.slice(0, plusIdx)).replace(/\./g, "");
    return `${base}@${d}`;
  }
  return `${local}@${d}`;
};

/**
 * Server-side validation helpers (mirrors client intent without importing client code)
 */
const isAdult18 = (dateString: string): boolean => {
  if (!dateString) return false;
  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 18 && age <= 100;
};

const isValidHeight = (heightString: string): boolean => {
  if (!heightString) return false;
  // Accept "170 cm" or just digits that we will normalize later to "<cm> cm"
  const cmPattern = /^\d{2,3}\s*cm$/i;
  const digitsOnly = /^\d{2,3}$/;
  return cmPattern.test(heightString) || digitsOnly.test(heightString);
};

const isValidPhone = (phone: string): boolean => {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

/**
 * Profile schema with stronger server-side validation, to log precise errors for 400s
 */
const profileSchema = z
  .object({
    fullName: z.string().min(1, "fullName is required"),
    dateOfBirth: z
      .string()
      .min(1, "dateOfBirth is required")
      .refine(isAdult18, "Must be at least 18 years old and a valid date"),
    gender: z.enum(["male", "female", "other"], {
      errorMap: () => ({ message: "gender is required" }),
    }),
    city: z.string().min(1, "city is required"),
    aboutMe: z.string().min(1, "aboutMe is required"),
    occupation: z.string().min(1, "occupation is required"),
    education: z.string().min(1, "education is required"),
    height: z
      .string()
      .min(1, "height is required")
      .refine(isValidHeight, 'Height must be a number or in the format like "170 cm"'),
    maritalStatus: z.enum(["single", "divorced", "widowed", "annulled"], {
      errorMap: () => ({ message: "maritalStatus is required" }),
    }),
    phoneNumber: z
      .string()
      .min(1, "phoneNumber is required")
      .refine(isValidPhone, "Please provide a valid phone number (10-15 digits)"),

    profileFor: z
      .enum(["self", "son", "daughter", "brother", "sister", "friend", "relative", ""])
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
      .enum(["vegetarian", "non-vegetarian", "halal", "vegan", "eggetarian", "other", ""])
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
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    // Distributed IP throttling (Convex-backed via HTTP client)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      // @ts-ignore Next runtime fallback
      (request as unknown as { ip?: string }).ip ||
      "unknown";
    const ipKey = `signup_ip:${ip}`;
    const WINDOW_MS = 30 * 1000;
    const MAX_ATTEMPTS = 8;

    const convex = getConvexClient();
    if (!convex) {
      console.error("Signup failure", {
        scope: "auth.signup",
        correlationId,
        type: "config_error",
        message: "Convex client not configured",
      });
      return NextResponse.json(
        { error: "Convex client not configured", hint: "Set NEXT_PUBLIC_CONVEX_URL in environment.", correlationId },
        { status: 500 }
      );
    }

    try {
      const now = Date.now();
      const existing = await convex.query(api.users.getRateLimitByKey, { key: ipKey }).catch(() => null);
      const toNum = (v: unknown) => (typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : 0);
      if (!existing || now - (existing.windowStart as number) > WINDOW_MS) {
        await convex.mutation(api.users.setRateLimitWindow, { key: ipKey, windowStart: now, count: 1 });
      } else {
        const next = toNum(existing.count) + 1;
        if (next > MAX_ATTEMPTS) {
          const retryAfterSec = Math.max(1, Math.ceil(((existing.windowStart as number) + WINDOW_MS - now) / 1000));
          return NextResponse.json(
            { error: "Too many signup attempts. Please wait and try again.", code: "RATE_LIMITED", retryAfter: retryAfterSec, correlationId },
            { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
          );
        }
        await convex.mutation(api.users.incrementRateLimit, { key: ipKey });
      }
    } catch (e) {
      console.warn("Rate limit store unavailable (best-effort only)", {
        scope: "auth.signup",
        correlationId,
        type: "ratelimit_warning",
        message: e instanceof Error ? e.message : String(e),
      });
      // best-effort: do not block if rate limit store is unavailable
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      console.warn("Signup invalid JSON body", {
        scope: "auth.signup",
        correlationId,
        type: "parse_error",
        message: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json(
        { error: "Invalid JSON body", correlationId },
        { status: 400 }
      );
    }

    let parsed: z.infer<typeof signupSchema>;
    try {
      parsed = signupSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
          code: e.code,
        }));
        console.warn("Signup validation failed", {
          scope: "auth.signup",
          correlationId,
          type: "validation_error",
          issueCount: issues.length,
          issues,
        });
        return NextResponse.json(
          { error: "Invalid input data", issues, correlationId },
          { status: 400 }
        );
      }
      console.error("Signup parsing failure", {
        scope: "auth.signup",
        correlationId,
        type: "parse_unhandled",
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Invalid input", correlationId },
        { status: 400 }
      );
    }

    const { email, password, fullName, profile } = parsed;

    const normalizedEmail = email.toLowerCase().trim();
    const emailCompare = normalizeGmailForCompare(normalizedEmail);

    // Per-identifier throttling
    try {
      const now = Date.now();
      const key = `signup_email_cmp:${emailCompare}`;
      const existing = await convex.query(api.users.getRateLimitByKey, { key }).catch(() => null);
      const toNum = (v: unknown) => (typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : 0);
      if (!existing || now - (existing.windowStart as number) > WINDOW_MS) {
        await convex.mutation(api.users.setRateLimitWindow, { key, windowStart: now, count: 1 });
      } else {
        const next = toNum(existing.count) + 1;
        if (next > MAX_ATTEMPTS) {
          const retryAfterSec = Math.max(1, Math.ceil(((existing.windowStart as number) + WINDOW_MS - now) / 1000));
          return NextResponse.json(
            { error: "Too many attempts for this email. Please wait and try again.", code: "RATE_LIMITED_ID", retryAfter: retryAfterSec, correlationId },
            { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
          );
        }
        await convex.mutation(api.users.incrementRateLimit, { key });
      }
    } catch (e) {
      console.warn("Email key rate limit warning", {
        scope: "auth.signup",
        correlationId,
        type: "ratelimit_warning",
        message: e instanceof Error ? e.message : String(e),
      });
      // continue on failure
    }

    // 1) Password policy & optional breach checks
    const strongPolicy =
      password.length >= 12 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
    if (!strongPolicy) {
      console.warn("Password policy failed", {
        scope: "auth.signup",
        correlationId,
        type: "password_policy",
        reason: "weak_password",
      });
      return NextResponse.json(
        { error: "Password does not meet security requirements", correlationId },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // 2) Existing account policy
    const existingByEmail = await convex
      .query(api.users.getUserByEmail, { email: normalizedEmail })
      .catch(() => null);

    if (existingByEmail) {
      if (existingByEmail.googleId && !existingByEmail.hashedPassword) {
        console.info("Existing Google-linked account for email", {
          scope: "auth.signup",
          correlationId,
          type: "account_exists_google",
        });
        return NextResponse.json(
          {
            status: "ok",
            message: "An account exists for this email. Please continue with Google sign-in.",
            code: "USE_GOOGLE_SIGNIN",
            correlationId,
          },
          { status: 200 }
        );
      }
      console.warn("Signup attempt for existing email (generic client response)", {
        scope: "auth.signup",
        correlationId,
        type: "account_exists_native_or_unknown",
      });
      return NextResponse.json(
        {
          status: "ok",
          message: "If an account exists for this email, follow the sign-in or password recovery flow.",
          code: "ACCOUNT_EXISTS_MAYBE",
          correlationId,
        },
        { status: 200 }
      );
    }

    // Normalize profile payload
    const scrubLocalStorageIds = (ids: unknown): string[] =>
      Array.isArray(ids)
        ? ids.filter((s) => typeof s === "string" && s.trim().length > 0 && !s.startsWith("local-"))
        : [];

    const normalizedProfile = {
      ...profile,
      email: profile.email ?? normalizedEmail,
      isProfileComplete: true,
      height:
        typeof profile.height === "string"
          ? /^\d{2,3}$/.test(profile.height.trim())
            ? `${profile.height.trim()} cm`
            : profile.height
          : String(profile.height ?? ""),
      annualIncome:
        typeof (profile as Record<string, unknown>).annualIncome === "number"
          ? (profile as Record<string, unknown>).annualIncome
          : typeof (profile as Record<string, unknown>).annualIncome === "string"
          ? (profile as Record<string, unknown>).annualIncome
          : undefined,
      partnerPreferenceCity: Array.isArray(
        (profile as Record<string, unknown>).partnerPreferenceCity
      )
        ? ((profile as Record<string, unknown>).partnerPreferenceCity as string[])
        : [],
      profileImageIds: scrubLocalStorageIds(
        (profile as Record<string, unknown>).profileImageIds
      ),
    };

    // Create user and profile atomically
    const result = await convex.action(api.users.createUserAndProfileViaSignup, {
      email: normalizedEmail,
      hashedPassword,
      fullName,
      profile: normalizedProfile,
    });

    const userIdOk = !!result?.userId;
    if (!userIdOk) {
      console.error("Signup failure", {
        scope: "auth.signup",
        correlationId,
        type: "create_user_failed",
      });
      return NextResponse.json({ error: "Failed to create user", correlationId }, { status: 500 });
    }

    // Issue tokens
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

    const response = NextResponse.json({
      status: "success",
      message: "Account created successfully",
      token: accessToken,
      user: {
        id: result.userId,
        email: normalizedEmail,
        role: "user",
      },
      isNewUser: true,
      redirectTo: "/success",
      refreshed: false,
      correlationId,
    });

    const { getAuthCookieAttrs, getPublicCookieAttrs } = await import("@/lib/auth/cookies");

    response.headers.set(
      "Set-Cookie",
      `auth-token=${accessToken}; ${getAuthCookieAttrs(60 * 15)}`
    );
    response.headers.append(
      "Set-Cookie",
      `refresh-token=${refreshToken}; ${getAuthCookieAttrs(60 * 60 * 24 * 7)}`
    );
    if (process.env.SHORT_PUBLIC_TOKEN === "1") {
      response.headers.append(
        "Set-Cookie",
        `authTokenPublic=${accessToken}; ${getPublicCookieAttrs(60)}`
      );
    }

    return response;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Signup failure", {
      scope: "auth.signup",
      correlationId,
      type: "unhandled_error",
      message: errMsg,
    });
    return NextResponse.json(
      { error: "Unable to complete signup at this time", correlationId },
      { status: 400 }
    );
  }
}
