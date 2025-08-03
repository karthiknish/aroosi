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
      if (!existing || now - existing.windowStart > WINDOW_MS) {
        await fetchMutation(api.users.setRateLimitWindow, {
          key: ipKey,
          windowStart: now,
          count: 1,
        });
      } else {
        const currentCount =
          typeof existing.count === "bigint"
            ? Number(existing.count)
            : Number(existing.count ?? 0);
        const next = currentCount + 1;
        if (next > MAX_ATTEMPTS) {
          const retryAfterSec = Math.max(
            1,
            Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000)
          );
          return NextResponse.json(
            {
              error: "Too many attempts. Please wait and try again.",
              code: "RATE_LIMITED",
              retryAfter: retryAfterSec,
            },
            { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
          );
        }
        await fetchMutation(api.users.incrementRateLimit, { key: ipKey });
      }
    } catch {
      // best-effort; if Convex unavailable, continue
    }

    const body = await request.json();
    const { email, password } = signinSchema.parse(body);

    const normalizedEmail = email.toLowerCase().trim();
    const emailCompare = normalizeGmailForCompare(normalizedEmail);

    // Per-identifier throttling
    try {
      const now = Date.now();
      const key = `signin_email_cmp:${emailCompare}`;
      const existing = (await fetchQuery(api.users.getRateLimitByKey, {
        key,
      }).catch(() => null)) as any;
      if (!existing || now - existing.windowStart > WINDOW_MS) {
        await fetchMutation(api.users.setRateLimitWindow, {
          key,
          windowStart: now,
          count: 1,
        });
      } else {
        const currentCount =
          typeof existing.count === "bigint"
            ? Number(existing.count)
            : Number(existing.count ?? 0);
        const next = currentCount + 1;
        if (next > MAX_ATTEMPTS) {
          const retryAfterSec = Math.max(
            1,
            Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000)
          );
          return NextResponse.json(
            {
              error:
                "Too many attempts for this email. Please wait and try again.",
              code: "RATE_LIMITED_ID",
              retryAfter: retryAfterSec,
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
    });

    // Generic invalid error to avoid enumeration
    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if account is banned
    if (user.banned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
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

    // Unified response shape
    const response = NextResponse.json({
      status: "ok",
      message: "Signed in successfully",
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role || "user",
        profile: profilePayload,
      },
      isNewUser: false,
      redirectTo,
      refreshed: false,
    });

    // Cookie policy identical and robust:
    // - HttpOnly access and refresh cookies
    // - SameSite=Lax to allow OAuth flows while protecting CSRF on top-level
    // - Secure in production
    // - Optional short-lived public token gated by SHORT_PUBLIC_TOKEN to prevent long-lived exposure
    const isProd = process.env.NODE_ENV === "production";
    const baseCookieAttrs = `Path=/; HttpOnly; SameSite=Lax; Max-Age=`;
    const secureAttr = isProd ? "; Secure" : "";

    response.headers.set(
      "Set-Cookie",
      `auth-token=${accessToken}; ${baseCookieAttrs}${60 * 15}${secureAttr}`
    );
    response.headers.append(
      "Set-Cookie",
      `refresh-token=${refreshToken}; ${baseCookieAttrs}${60 * 60 * 24 * 7}${secureAttr}`
    );
    if (process.env.SHORT_PUBLIC_TOKEN === "1") {
      response.headers.append(
        "Set-Cookie",
        `authTokenPublic=${accessToken}; Path=/; SameSite=Lax; Max-Age=60${secureAttr}`
      );
    }

    return response;
  } catch (error) {
    // PII-safe logging
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn("Signin failure:", { message: errMsg });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: error.errors?.map((e) => ({
            path: e.path,
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
