import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { signAccessJWT, signRefreshJWT } from "@/lib/auth/jwt";

// Normalize Gmail for comparison-only throttling
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
    // Distributed IP throttling (Convex-backed via HTTP client)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      // @ts-ignore Next runtime fallback
      (request as any).ip ||
      "unknown";
    const ipKey = `signup_ip:${ip}`;
    const WINDOW_MS = 30 * 1000;
    const MAX_ATTEMPTS = 8;

    const convex = getConvexClient();
    if (!convex) {
      return NextResponse.json(
        { error: "Convex client not configured", hint: "Set NEXT_PUBLIC_CONVEX_URL in environment." },
        { status: 500 }
      );
    }

    try {
      const now = Date.now();
      const existing = await convex.query(api.users.getRateLimitByKey, { key: ipKey }).catch(() => null);
      const toNum = (v: unknown) => {
        if (typeof v === "number") return v;
        if (typeof v === "bigint") return Number(v);
        return 0;
      };
      if (!existing || now - (existing.windowStart as number) > WINDOW_MS) {
        await convex.mutation(api.users.setRateLimitWindow, { key: ipKey, windowStart: now, count: 1 });
      } else {
        const next = toNum(existing.count) + 1;
        if (next > MAX_ATTEMPTS) {
          const retryAfterSec = Math.max(1, Math.ceil(((existing.windowStart as number) + WINDOW_MS - now) / 1000));
          return NextResponse.json(
            { error: "Too many signup attempts. Please wait and try again.", code: "RATE_LIMITED", retryAfter: retryAfterSec },
            { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
          );
        }
        await convex.mutation(api.users.incrementRateLimit, { key: ipKey });
      }
    } catch {
      // best-effort: do not block if rate limit store is unavailable
    }

    const body = await request.json();
    const { email, password, fullName, profile } = signupSchema.parse(body);

    const normalizedEmail = email.toLowerCase().trim();
    const emailCompare = normalizeGmailForCompare(normalizedEmail);

    // Per-identifier throttling
    try {
      const now = Date.now();
      const key = `signup_email_cmp:${emailCompare}`;
      const existing = await convex.query(api.users.getRateLimitByKey, { key }).catch(() => null);
      const toNum = (v: unknown) => {
        if (typeof v === "number") return v;
        if (typeof v === "bigint") return Number(v);
        return 0;
      };
      if (!existing || now - (existing.windowStart as number) > WINDOW_MS) {
        await convex.mutation(api.users.setRateLimitWindow, { key, windowStart: now, count: 1 });
      } else {
        const next = toNum(existing.count) + 1;
        if (next > MAX_ATTEMPTS) {
          const retryAfterSec = Math.max(1, Math.ceil(((existing.windowStart as number) + WINDOW_MS - now) / 1000));
          return NextResponse.json(
            { error: "Too many attempts for this email. Please wait and try again.", code: "RATE_LIMITED_ID", retryAfter: retryAfterSec },
            { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
          );
        }
        await convex.mutation(api.users.incrementRateLimit, { key });
      }
    } catch {
      // continue on failure
    }

    // 1) Password policy & optional breach checks (HIBP-style hook point)
    // Enforce stronger password policy here (example: min 12, at least 1 upper/lower/digit/special)
    const strongPolicy =
      password.length >= 12 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
    if (!strongPolicy) {
      return NextResponse.json(
        { error: "Password does not meet security requirements" },
        { status: 400 }
      );
    }
    // Optional: add a breach-check (e.g., HIBP k-anonymity) here if desired (best-effort, PII-safe logging)

    const hashedPassword = await bcrypt.hash(password, 12);

    // 2) Guarded linking posture vs existing Google-only accounts
    // If an existing account with same comparison-normalized email exists and is Google-linked (no password or explicit googleId),
    // prevent native signup and instruct to continue with Google for security and account unification.
    const existingByEmail = await convex.query(api.users.getUserByEmail, {
      email: normalizedEmail,
    }).catch(() => null);

    if (existingByEmail) {
      // If user has googleId or lacks hashedPassword (Google-only), block native signup
      if (existingByEmail.googleId && !existingByEmail.hashedPassword) {
        return NextResponse.json(
          {
            status: "ok",
            message: "An account exists for this email. Please continue with Google sign-in.",
            code: "USE_GOOGLE_SIGNIN",
          },
          { status: 200 }
        );
      }
      // Otherwise (native account exists), keep enumeration resistant generic messaging
      console.warn("Signup attempt for existing email (suppressed to client).");
      return NextResponse.json(
        {
          status: "ok",
          message:
            "If an account exists for this email, follow the sign-in or password recovery flow.",
          code: "ACCOUNT_EXISTS_MAYBE",
        },
        { status: 200 }
      );
    }

    // Scrub local placeholder image ids
    const scrubLocalStorageIds = (ids: unknown): string[] => {
      if (!Array.isArray(ids)) return [];
      return ids.filter(
        (s) => typeof s === "string" && s.trim().length > 0 && !s.startsWith("local-")
      );
    };

    // Normalize profile payload
    const normalizedProfile = {
      ...profile,
      email: profile.email ?? normalizedEmail,
      isProfileComplete: true,
      height: typeof profile.height === "string" ? profile.height : String(profile.height ?? ""),
      annualIncome:
        typeof (profile as any).annualIncome === "number"
          ? (profile as any).annualIncome
          : typeof (profile as any).annualIncome === "string"
          ? (profile as any).annualIncome
          : undefined,
      partnerPreferenceCity: Array.isArray((profile as any).partnerPreferenceCity)
        ? (profile as any).partnerPreferenceCity
        : [],
      profileImageIds: scrubLocalStorageIds((profile as any).profileImageIds),
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
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
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

    // Unified response shape (parity with Google/signin). No profile fetch here; client can call /me.
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
    });

    // Cookie policy via centralized helper (supports subdomains/cross-site)
    const { getAuthCookieAttrs, getPublicCookieAttrs } = await import("@/lib/auth/cookies");

    // Access token cookie (15 minutes)
    response.headers.set(
      "Set-Cookie",
      `auth-token=${accessToken}; ${getAuthCookieAttrs(60 * 15)}`
    );
    // Refresh token cookie (7 days)
    response.headers.append(
      "Set-Cookie",
      `refresh-token=${refreshToken}; ${getAuthCookieAttrs(60 * 60 * 24 * 7)}`
    );
    // Optional short-lived public token gated by SHORT_PUBLIC_TOKEN=1
    if (process.env.SHORT_PUBLIC_TOKEN === "1") {
      response.headers.append(
        "Set-Cookie",
        `authTokenPublic=${accessToken}; ${getPublicCookieAttrs(60)}`
      );
    }

    return response;
  } catch (error) {
    // Structured server logging with safe details and correlation id
    const correlationId = Math.random().toString(36).slice(2, 10);
    const baseLog = {
      scope: "auth.signup",
      correlationId,
    };

    if (error instanceof z.ZodError) {
      const details = error.errors?.map((e) => ({
        path: e.path,
        message: e.message,
        code: e.code,
      })) ?? [];

      // Server log with structured fields (no PII beyond schema paths)
      console.warn("Signup validation failed", {
        ...baseLog,
        type: "validation_error",
        issues: details,
        issueCount: details.length,
      });

      // Client response includes correlationId for support traceability
      return NextResponse.json(
        {
          error: "Invalid input data",
          details,
          correlationId,
        },
        { status: 400 }
      );
    }

    const errMsg = error instanceof Error ? error.message : String(error);

    // Log non-validation failures with classification and safe preview
    console.error("Signup failure", {
      ...baseLog,
      type: "unhandled_error",
      message: errMsg,
    });

    // Enumeration-resistant generic failure, with correlationId for tracing
    return NextResponse.json(
      { error: "Unable to complete signup at this time", correlationId },
      { status: 400 }
    );
  }
}
