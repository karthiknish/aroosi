import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signAccessJWT, signRefreshJWT } from "@/lib/auth/jwt";
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
  const startedAt = Date.now();

  try {
    // Distributed IP throttling via Convex
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      // @ts-ignore Next runtime fallback
      (request as any).ip ||
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
          console.warn("Signin rate limited", {
            scope: "auth.signin",
            correlationId,
            type: "rate_limited_ip",
            ip,
            retryAfterSec,
            statusCode: 429,
            durationMs: Date.now() - startedAt,
          });
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
    } catch (e) {
      console.warn("Signin ratelimit store unavailable (best-effort)", {
        scope: "auth.signin",
        correlationId,
        type: "ratelimit_warning",
        message: e instanceof Error ? e.message : String(e),
        statusCode: 200,
        durationMs: Date.now() - startedAt,
      });
      // best-effort; if Convex unavailable, continue
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      console.warn("Signin invalid JSON body", {
        scope: "auth.signin",
        correlationId,
        type: "parse_error",
        message: e instanceof Error ? e.message : String(e),
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Invalid JSON body", correlationId },
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
        console.warn("Signin validation failed", {
          scope: "auth.signin",
          correlationId,
          type: "validation_error",
          issueCount: issues.length,
          issues,
          statusCode: 400,
          durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(
          { error: "Invalid input data", issues, correlationId },
          { status: 400 }
        );
      }
      console.error("Signin parsing failure", {
        scope: "auth.signin",
        correlationId,
        type: "parse_unhandled",
        message: error instanceof Error ? error.message : String(error),
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Invalid input", correlationId },
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
          console.warn("Signin rate limited by email", {
            scope: "auth.signin",
            correlationId,
            type: "rate_limited_id",
            emailCompare,
            retryAfterSec,
          });
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
    } catch (e) {
      console.warn("Signin email ratelimit warning", {
        scope: "auth.signin",
        correlationId,
        type: "ratelimit_warning",
        message: e instanceof Error ? e.message : String(e),
      });
      // skip if Convex unavailable
    }

    // Get user by email (normalized)
    const user = await fetchQuery(api.users.getUserByEmail, {
      email: normalizedEmail,
    }).catch((e: unknown) => {
      console.error("Signin fetch user error", {
        scope: "auth.signin",
        correlationId,
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    });

    // Generic invalid error to avoid enumeration
    if (!user || !user.hashedPassword) {
      console.warn("Signin invalid user or no password", {
        scope: "auth.signin",
        correlationId,
        type: "invalid_credentials_no_user",
        emailHash: Buffer.from(normalizedEmail).toString("base64url"),
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Invalid email or password", correlationId },
        { status: 401 }
      );
    }

    // Check if account is banned
    if (user.banned) {
      console.warn("Signin banned account attempt", {
        scope: "auth.signin",
        correlationId,
        type: "banned",
        userId: String(user._id),
        statusCode: 403,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Account is banned", correlationId },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      console.warn("Signin invalid password", {
        scope: "auth.signin",
        correlationId,
        type: "invalid_credentials_bad_password",
        userId: String(user._id),
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Invalid email or password", correlationId },
        { status: 401 }
      );
    }

    // Generate access & refresh tokens with aud/iss and refresh ver embedded by library
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

    // Fetch profile for gating flags (by userId)
    const profile = await fetchQuery(api.users.getProfileByUserIdPublic, {
      userId: user._id,
    }).catch((e: unknown) => {
      console.error("Signin fetch profile error", {
        scope: "auth.signin",
        correlationId,
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    });

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

    // Unified response shape with no-store; PURE TOKEN MODEL (no cookies)
    const response = NextResponse.json(
      {
        status: "ok",
        message: "Signed in successfully",
        accessToken,
        refreshToken,
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

    console.info("Signin success", {
      scope: "auth.signin",
      correlationId,
      type: "success",
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      userId: String(user._id),
    });
    return response;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Signin unhandled error", {
      scope: "auth.signin",
      correlationId,
      type: "unhandled_error",
      message: errMsg,
      statusCode: error instanceof z.ZodError ? 400 : 500,
      durationMs: Date.now() - startedAt,
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid input data",
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
      { error: "Internal server error", correlationId },
      { status: 500 }
    );
  }
}
