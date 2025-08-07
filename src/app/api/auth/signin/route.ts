import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Normalize Gmail for comparison only (dot/plus insensitivity). Do not persist this form.
const normalizeGmailForCompare = (e: string) => {
  const [local, domain] = e.split("@");
  if (!local || !domain) return e.toLowerCase().trim();
  const d = domain.toLowerCase();
  if (d === "gmail.com" || d === "googlemail.com") {
    const plusIdx = local.indexOf("+");
    const base = (plusIdx === -1 ? local : local.slice(0, plusIdx)).replace(
      /\./g,
      ""
    );
    return `${base}@${d}`;
  }
  return `${local}@${d}`;
};

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const _startedAt = Date.now();

  try {
    // Distributed IP throttling via Convex
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      ((request as any).ip as string | undefined) ||
      "unknown";
    const ipKey = `signin_ip:${ip}`;
    const WINDOW_MS = 30 * 1000;
    const MAX_ATTEMPTS = 8;

    try {
      const now = Date.now();
      const existing = (await fetchQuery(api.users.getRateLimitByKey, {
        key: ipKey,
      }).catch(() => null)) as any;

      const toNum = (v: unknown) =>
        typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : 0;

      if (!existing || now - toNum(existing.windowStart) > WINDOW_MS) {
        await fetchMutation(api.users.setRateLimitWindow, {
          key: ipKey,
          windowStart: now,
          count: 1,
        });
      } else {
        const next = toNum(existing.count) + 1;
        if (next > MAX_ATTEMPTS) {
          const retryAfterSec = Math.max(
            1,
            Math.ceil((toNum(existing.windowStart) + WINDOW_MS - now) / 1000)
          );
          return NextResponse.json(
            {
              error: "Too many attempts. Please wait and try again.",
              code: "RATE_LIMITED",
              retryAfter: retryAfterSec,
              correlationId,
            },
            { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
          );
        }
        await fetchMutation(api.users.incrementRateLimit, { key: ipKey });
      }
    } catch {
      // best-effort; continue
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: "Invalid JSON body",
          code: "INVALID_JSON",
          correlationId,
          details: msg,
        },
        { status: 400 }
      );
    }

    let email: string;
    let password: string;
    try {
      const parsed = signinSchema.parse(body);
      email = parsed.email;
      password = parsed.password;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
          code: e.code,
        }));
        return NextResponse.json(
          {
            error: "Invalid input data",
            code: "INVALID_INPUT",
            issues,
            correlationId,
          },
          { status: 400 }
        );
      }
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        {
          error: "Invalid input",
          code: "PARSE_ERROR",
          details: msg,
          correlationId,
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailCompare = normalizeGmailForCompare(normalizedEmail);

    // Per-identifier throttling
    try {
      const now = Date.now();
      const key = `signin_email_cmp:${emailCompare}`;
      const existing = (await fetchQuery(api.users.getRateLimitByKey, {
        key,
      }).catch(() => null)) as any;

      const toNum = (v: unknown) =>
        typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : 0;

      if (!existing || now - toNum(existing.windowStart) > WINDOW_MS) {
        await fetchMutation(api.users.setRateLimitWindow, {
          key,
          windowStart: now,
          count: 1,
        });
      } else {
        const next = toNum(existing.count) + 1;
        if (next > MAX_ATTEMPTS) {
          const retryAfterSec = Math.max(
            1,
            Math.ceil((toNum(existing.windowStart) + WINDOW_MS - now) / 1000)
          );
          return NextResponse.json(
            {
              error:
                "Too many attempts for this email. Please wait and try again.",
              code: "RATE_LIMITED_ID",
              retryAfter: retryAfterSec,
              correlationId,
            },
            { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
          );
        }
        await fetchMutation(api.users.incrementRateLimit, { key });
      }
    } catch {
      // skip if Convex unavailable
    }

    // Get user by email (normalized)
    const user = await fetchQuery(api.users.getUserByEmail, {
      email: normalizedEmail,
    }).catch(() => null as any);

    // Generic invalid error to avoid enumeration
    if (!user || !user.hashedPassword) {
      const msg = !user
        ? "No user found for this email."
        : "User exists but has no password set (Google sign-in only or incomplete signup).";
      return NextResponse.json(
        {
          error: "Invalid email or password",
          code: !user ? "USER_NOT_FOUND" : "NO_PASSWORD_SET",
          correlationId,
          details: msg,
        },
        { status: 401 }
      );
    }

    // Banned?
    if (user.banned) {
      return NextResponse.json(
        { error: "Account is banned", code: "USER_BANNED", correlationId },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          error: "Invalid email or password",
          code: "INVALID_PASSWORD",
          correlationId,
        },
        { status: 401 }
      );
    }

    // Fetch profile flags
    const profile = await fetchQuery(api.users.getProfileByUserIdPublic, {
      userId: user._id,
    }).catch(() => null);
    const profilePayload = profile
      ? {
          id: profile._id,
          isProfileComplete: !!(profile as any).isProfileComplete,
          isOnboardingComplete: !!(profile as any).isOnboardingComplete,
        }
      : null;

    const redirectTo =
      profilePayload && profilePayload.isProfileComplete
        ? "/search"
        : "/profile/create";

    // Cookie-session model: rely on server-auth cookie; do not return tokens
    const response = NextResponse.json(
      {
        status: "ok",
        message: "Signed in successfully",
        code: "SIGNED_IN",
        user: {
          id: user._id,
          email: user.email,
          role: user.role || "user",
          profile: profilePayload,
        },
        isNewUser: false,
        redirectTo,
        refreshed: false,
        correlationId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
    return response;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          code: "UNHANDLED_ZOD_ERROR",
          details: error.errors?.map((e) => ({
            path: e.path,
            message: e.message,
          })),
          correlationId,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        correlationId,
        details: errMsg,
      },
      { status: 500 }
    );
  }
}
