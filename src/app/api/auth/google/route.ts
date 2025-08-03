import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { signAccessJWT, signRefreshJWT } from "@/lib/auth/jwt";
import { sendWelcomeEmail } from "@/lib/auth/email";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

type RateLimitRecord = { count: number; windowStart: number };

// Minimal shape for Google token payload fields we actually use
type GoogleIdTokenPayload = {
  iss?: string;
  aud?: string;
  azp?: string;
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
};

// User model subset used by this handler
type UserLite = {
  _id: Id<"users">;
  email: string;
  role?: string;
  googleId?: string;
  banned?: boolean;
};

// Profile subset used in response
type ProfileLite = {
  _id: string;
  isProfileComplete?: boolean;
  isOnboardingComplete?: boolean;
};

// Narrow global for in-memory throttle map
declare global {
  // eslint-disable-next-line no-var
  var __google_oauth_ip_rate__:
    | Map<string, RateLimitRecord>
    | undefined;
}

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const googleAuthSchema = z.object({
  credential: z.string(), // Google user info JSON or ID token
  state: z.string().min(16, "Missing or invalid state"),
});

export async function POST(request: NextRequest) {
  try {
    // Persisted, distributed IP throttle using Convex rateLimits table.
    // Falls back to in-memory throttle if Convex request fails.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      // @ts-ignore Next runtime fallback
      request.ip ||
      "unknown";
    const endpointKey = `google_oauth:${ip}`;
    const WINDOW_MS = 30 * 1000; // 30s window
    const MAX_ATTEMPTS = 8;

    let throttled = false;
    let retryAfterSec: number | undefined;

    try {
      // Fetch record
      const now = Date.now();
      const existing = (await fetchQuery(api.users.getRateLimitByKey, {
        key: endpointKey,
      }).catch(() => null)) as RateLimitRecord | null;

      if (!existing || now - existing.windowStart > WINDOW_MS) {
        // Reset window
        await fetchMutation(api.users.setRateLimitWindow, {
          key: endpointKey,
          windowStart: now,
          count: 1,
        });
      } else {
        const nextCount = (existing.count as number) + 1;
        if (nextCount > MAX_ATTEMPTS) {
          throttled = true;
          retryAfterSec = Math.max(
            1,
            Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000)
          );
        } else {
          await fetchMutation(api.users.incrementRateLimit, {
            key: endpointKey,
          });
        }
      }
    } catch {
      // Fallback to best-effort in-memory throttle if Convex is unreachable
      const now = Date.now();
      const g = global as unknown as typeof global & {
        __google_oauth_ip_rate__?: Map<string, RateLimitRecord>;
      };
      if (!g.__google_oauth_ip_rate__) {
        g.__google_oauth_ip_rate__ = new Map<string, RateLimitRecord>();
      }
      const rateMap: Map<string, RateLimitRecord> = g.__google_oauth_ip_rate__;
      const rec = rateMap.get(ip);
      if (!rec || now - rec.windowStart > WINDOW_MS) {
        rateMap.set(ip, { count: 1, windowStart: now });
      } else {
        rec.count += 1;
        if (rec.count > MAX_ATTEMPTS) {
          throttled = true;
          retryAfterSec = Math.max(
            1,
            Math.ceil((rec.windowStart + WINDOW_MS - now) / 1000)
          );
        }
      }
    }

    if (throttled) {
      return NextResponse.json(
        {
          error: "Too many Google sign-in attempts. Please wait and try again.",
          code: "RATE_LIMITED",
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers: retryAfterSec
            ? { "Retry-After": String(retryAfterSec) }
            : undefined,
        }
      );
    }

    const body = await request.json();
    const { credential, state } = googleAuthSchema.parse(body);

    // CSRF/state validation against cookie set by client popup initiator
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const idx = c.indexOf("=");
          const k = idx >= 0 ? c.slice(0, idx) : c;
          const v = idx >= 0 ? decodeURIComponent(c.slice(idx + 1)) : "";
          return [k, v] as const;
        })
    );
    const stateCookie = cookies["oauth_state"];

    if (!stateCookie || stateCookie !== state) {
      const resp = NextResponse.json(
        { error: "Invalid OAuth state", code: "INVALID_STATE" },
        { status: 400 }
      );
      // Clear potentially stale state cookie
      resp.headers.append(
        "Set-Cookie",
        `oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
          process.env.NODE_ENV === "production" ? "; Secure" : ""
        }`
      );
      return resp;
    }

    // Replay cache: prevent re-use of same credential within short TTL
    // Use a stable hash to avoid storing tokens in logs or DB directly
    const encoder = new TextEncoder();
    // Use Web Crypto if available; otherwise Node crypto
    const digest = globalThis.crypto?.subtle
      ? await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(credential))
      : (await import("crypto")).createHash("sha256").update(credential).digest();
    const credHashBuf = digest instanceof ArrayBuffer ? digest : Uint8Array.from(digest).buffer;
    const credHash = Array.from(new Uint8Array(credHashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Keyed by hash; TTL window in ms
    const REPLAY_TTL_MS = 10 * 60 * 1000; // 10 minutes
    const replayKey = `google_replay:${credHash}`;

    try {
      const existingReplay = (await fetchQuery(api.users.getRateLimitByKey, { key: replayKey }).catch(() => null)) as RateLimitRecord | null;
      const now = Date.now();
      if (existingReplay && now - existingReplay.windowStart <= REPLAY_TTL_MS) {
        // Already seen recently -> block as replay
        const resp = NextResponse.json(
          {
            error: "Google token was already used",
            code: "TOKEN_REPLAY",
            action: "Please retry sign-in to obtain a fresh token.",
          },
          { status: 400 }
        );
        // Clear state cookie to avoid leaking valid state after an attempt
        resp.headers.append(
          "Set-Cookie",
          `oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
            process.env.NODE_ENV === "production" ? "; Secure" : ""
          }`
        );
        return resp;
      }
      // Record first-seen (or refresh window) using rate limit table as a lightweight TTL store
      if (!existingReplay || now - existingReplay.windowStart > REPLAY_TTL_MS) {
        await fetchMutation(api.users.setRateLimitWindow, {
          key: replayKey,
          windowStart: now,
          count: 1,
        });
      } else {
        // Update count to keep an audit trail; not strictly necessary for enforcement
        await fetchMutation(api.users.incrementRateLimit, { key: replayKey });
      }
    } catch {
      // If Convex is unavailable, skip replay enforcement to avoid false positives
      // IP rate limiting above and Google's own protections still apply.
    }

    let payload: GoogleIdTokenPayload | null;
    let googleId: string;
    let email: string;
    let name: string;
    let given_name: string;
    let family_name: string;
    let email_verified: boolean;

    try {
      // Try to parse as user info JSON first (new popup method)
      const userInfo = JSON.parse(credential) as {
        sub?: string;
        id?: string;
        email?: string;
        name?: string;
        given_name?: string;
        family_name?: string;
        verified_email?: boolean;
      };
      if (userInfo.email && userInfo.verified_email !== undefined) {
        payload = {
          sub: userInfo.sub,
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          given_name: userInfo.given_name,
          family_name: userInfo.family_name,
          email_verified: userInfo.verified_email,
        };
        // Prefer the stable 'sub' or 'id' claim; fall back to email only if present
        googleId = userInfo.sub || userInfo.id || userInfo.email || "";

        if (!googleId) {
          throw new Error("Missing Google ID");
        }

        email = userInfo.email;
        name = userInfo.name ?? "";
        given_name = userInfo.given_name ?? "";
        family_name = userInfo.family_name ?? "";
        email_verified = userInfo.verified_email === true;
      } else {
        throw new Error("Not user info format");
      }
    } catch {
      // Fallback to ID token verification (original method)
      const ticket = await client.verifyIdToken({
        idToken: credential,
        // audience can be a string or array; we'll verify aud/azp manually below as well
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      payload = ticket.getPayload() as GoogleIdTokenPayload | null;
      if (!payload) {
        return NextResponse.json(
          { error: "Invalid Google token" },
          { status: 400 }
        );
      }

      // Additional issuer/audience enforcement
      const iss = payload.iss;
      const aud = payload.aud;
      const azp = payload.azp;

      const validIssuers = new Set<string>([
        "https://accounts.google.com",
        "accounts.google.com",
      ]);

      // Allow multiple client IDs (web/mobile) via comma-separated env
      const allowedAudRaw =
        process.env.GOOGLE_ALLOWED_CLIENT_IDS ||
        process.env.GOOGLE_CLIENT_ID ||
        "";
      const allowedAudSet = new Set(
        allowedAudRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );

      if (!iss || !validIssuers.has(iss)) {
        return NextResponse.json(
          { error: "Invalid token issuer", code: "INVALID_ISSUER" },
          { status: 400 }
        );
      }
      if (!aud || !allowedAudSet.has(aud)) {
        return NextResponse.json(
          { error: "Invalid token audience", code: "INVALID_AUDIENCE" },
          { status: 400 }
        );
      }
      if (azp && !allowedAudSet.has(azp)) {
        return NextResponse.json(
          { error: "Invalid authorized party", code: "INVALID_AZP" },
          { status: 400 }
        );
      }

      googleId = (payload.sub || payload.id || payload.email || "").toString();
      email = (payload.email || "").toString();
      name = (payload.name || "").toString();
      given_name = (payload.given_name || "").toString();
      family_name = (payload.family_name || "").toString();
      email_verified = payload.email_verified === true;
    }

    // Harden inputs
    if (!email) {
      return NextResponse.json(
        { error: "Google account did not provide an email" },
        { status: 400 }
      );
    }
    if (!email_verified) {
      return NextResponse.json(
        { error: "Email not verified with Google" },
        { status: 400 }
      );
    }

    // Normalize email for comparisons, but do not overwrite user's primary email with Gmail alias variants
    const normalizedEmail = email.toLowerCase().trim();

    // Helper: normalize Gmail for comparison (dot/plus removal) - comparison only
    const normalizeGmailForCompare = (e: string) => {
      const [local, domain] = e.split("@");
      if (!local || !domain) return e;
      const d = domain.toLowerCase();
      if (d === "gmail.com" || d === "googlemail.com") {
        const plusIdx = local.indexOf("+");
        const base = (plusIdx === -1 ? local : local.slice(0, plusIdx)).replace(/\./g, "");
        return `${base}@${d}`;
      }
      return `${local}@${d}`;
    };
    const normalizedForCompare = normalizeGmailForCompare(normalizedEmail);

    let user: UserLite | null;
    let isNewUser = false;

    // Per-identifier throttling keys (in addition to IP throttling)
    // Throttle by googleId (if present) and by normalized comparison email to prevent abuse across IPs
    try {
      const now = Date.now();
      const WINDOW_MS_ID = 30 * 1000; // 30s
      const MAX_ATTEMPTS_ID = 8;

      // Throttle by googleId
      if (googleId) {
        const keyG = `google_oauth_gid:${googleId}`;
        const existingG = (await fetchQuery(api.users.getRateLimitByKey, { key: keyG }).catch(() => null)) as RateLimitRecord | null;
        if (!existingG || now - existingG.windowStart > WINDOW_MS_ID) {
          await fetchMutation(api.users.setRateLimitWindow, { key: keyG, windowStart: now, count: 1 });
        } else {
          const nextG = (existingG.count as number) + 1;
          if (nextG > MAX_ATTEMPTS_ID) {
            const retryAfterSec = Math.max(1, Math.ceil((existingG.windowStart + WINDOW_MS_ID - now) / 1000));
            return NextResponse.json(
              {
                error: "Too many attempts for this Google account. Please wait and try again.",
                code: "RATE_LIMITED_ID",
                retryAfter: retryAfterSec,
              },
              { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
            );
          } else {
            await fetchMutation(api.users.incrementRateLimit, { key: keyG });
          }
        }
      }

      // Throttle by normalized comparison email
      if (normalizedForCompare) {
        const keyE = `google_oauth_email:${normalizedForCompare}`;
        const existingE = (await fetchQuery(api.users.getRateLimitByKey, { key: keyE }).catch(() => null)) as RateLimitRecord | null;
        if (!existingE || now - existingE.windowStart > WINDOW_MS_ID) {
          await fetchMutation(api.users.setRateLimitWindow, { key: keyE, windowStart: now, count: 1 });
        } else {
          const nextE = (existingE.count as number) + 1;
          if (nextE > MAX_ATTEMPTS_ID) {
            const retryAfterSec = Math.max(1, Math.ceil((existingE.windowStart + WINDOW_MS_ID - now) / 1000));
            return NextResponse.json(
              {
                error: "Too many attempts for this email. Please wait and try again.",
                code: "RATE_LIMITED_ID",
                retryAfter: retryAfterSec,
              },
              { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
            );
          } else {
            await fetchMutation(api.users.incrementRateLimit, { key: keyE });
          }
        }
      }
    } catch {
      // Best effort; if Convex unavailable, skip per-identifier throttling
    }

    // Prefer lookup by googleId when available, then fall back to email.
    // This block is hardened to avoid duplicate accounts by googleId under races.
    user = await fetchQuery(api.users.getUserByGoogleId, { googleId }).catch(
      () => null
    );

    if (user) {
      // If Google reports a different email:
      // - Do NOT overwrite primary email if difference is only a Gmail dot/plus alias normalization.
      // - Otherwise, keep user's chosen primary email (store googleEmail separately if schema supports it).
      const userEmailLc = (user.email || "").toLowerCase().trim();
      const userForCompare = normalizeGmailForCompare(userEmailLc);
      if (normalizedForCompare !== userForCompare && userEmailLc !== normalizedEmail) {
        // Non-alias difference (e.g., changed Google primary or different domain)
        // Intentionally not overwriting user.email here; proceed without sync.
        // If you add a googleEmail field later, set it via a dedicated mutation here.
      }
    } else {
      // No googleId match → check by email
      user = await fetchQuery(api.users.getUserByEmail, {
        email: normalizedEmail,
      });

      if (user) {
        // Before linking, ensure googleId is not already attached to another account
        const existingByGoogle = await fetchQuery(api.users.getUserByGoogleId, {
          googleId,
        }).catch(() => null);
        if (existingByGoogle && existingByGoogle._id !== user._id) {
          // Another account already owns this googleId → prefer that canonical account
          user = existingByGoogle;
          // Do not overwrite primary email based on Gmail alias differences
          // If non-alias email differs, consider storing googleEmail separately (no-op here)
        } else {
          // Safe to link Google account to email-matched user
          if (!user.googleId) {
            // Use guarded link to enforce uniqueness of googleId
            try {
              await fetchMutation(api.users.linkGoogleAccountGuarded, {
                userId: user._id,
                googleId,
              });
              user = { ...user, googleId };
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              if (
                msg.includes("GOOGLE_ID_ALREADY_LINKED")
              ) {
                // Another account claimed this googleId; prefer that canonical account
                const existingByGoogle = await fetchQuery(
                  api.users.getUserByGoogleId,
                  { googleId }
                ).catch(() => null);
                if (existingByGoogle) {
                  user = existingByGoogle;
                } else {
                  return NextResponse.json(
                    {
                      error: "Google account already linked to another user",
                      code: "GOOGLE_ID_CONFLICT",
                    },
                    { status: 409 }
                  );
                }
              } else {
                throw e;
              }
            }
          }
        }
      } else {
        // Before creating, re-check for races on both googleId and email
        const raceGoogle = await fetchQuery(api.users.getUserByGoogleId, {
          googleId,
        }).catch(() => null);
        if (raceGoogle) {
          user = raceGoogle;
          if (user.email?.toLowerCase() !== normalizedEmail) {
            try {
              await fetchMutation(api.users.updateUserAndProfileEmail, {
                userId: user._id,
                email: normalizedEmail,
              });
              user = { ...user, email: normalizedEmail };
            } catch (syncErr) {
              console.warn(
                "Failed to sync user/profile email after race-google:",
                syncErr
              );
            }
          }
        } else {
          const raceEmail = await fetchQuery(api.users.getUserByEmail, {
            email: normalizedEmail,
          }).catch(() => null);

          if (raceEmail) {
            // If email user already has a different googleId, do not overwrite; choose 409
            if (raceEmail.googleId && raceEmail.googleId !== googleId) {
              // Enumeration-resistant generic response for linking conflict
              return NextResponse.json(
                {
                  status: "ok",
                  message: "Unable to complete sign-in for this account. Please use the original sign-in method.",
                  code: "ACCOUNT_LINK_CONFLICT",
                },
                { status: 200 }
              );
            }
            // Link googleId to the email user
            user = raceEmail;
            if (!user.googleId) {
              await fetchMutation(api.auth.linkGoogleAccount, {
                userId: user._id,
                googleId,
              });
              user = { ...user, googleId };
            }
            // Do not overwrite primary email; if schema supports, record googleEmail separately (no-op here)
          } else {
            // Create new user with Google account
            isNewUser = true;
            try {
              await fetchMutation(api.auth.createGoogleUser, {
                email: normalizedEmail,
                googleId,
                firstName: given_name || "",
                lastName: family_name || "",
                name: name || "",
              });
            } catch (e) {
              // If a race created the user meanwhile, continue
              console.warn(
                "createGoogleUser failed, will attempt to fetch existing:",
                e
              );
            }

            // Get (or re-fetch) the created user from database
            user = await fetchQuery(api.users.getUserByEmail, {
              email: normalizedEmail,
            });

            if (!user) {
              // As a last attempt, try by googleId in case creation attached it
              const maybeGoogleUser = await fetchQuery(
                api.users.getUserByGoogleId,
                { googleId }
              ).catch(() => null);
              if (maybeGoogleUser) {
                user = maybeGoogleUser;
              }
            }

            if (!user) {
              // Enumeration-resistant generic response
              return NextResponse.json(
                {
                  status: "error",
                  message: "Unable to complete sign-in at this time. Please try again.",
                  code: "GOOGLE_USER_CREATE_FAILED",
                },
                { status: 400 }
              );
            }

            // Send welcome email for new users (best effort)
            try {
              await sendWelcomeEmail(normalizedEmail, name || "User");
            } catch (emailError) {
              console.warn("Failed to send welcome email:", emailError);
              // Don't fail the auth flow for email issues
            }
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Check if account is banned
    if (user.banned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    // Generate access & refresh tokens (same as signin/signup)
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

    // After issuing tokens, fetch profile explicitly by userId (avoid Convex ctx.auth timing)
    const profile = (await fetchQuery(api.users.getProfileByUserIdPublic, {
      userId: user._id,
    })) as ProfileLite | null;

    // Derive safe gating flags
    const profilePayload = profile
      ? {
          id: profile._id,
          isProfileComplete: !!profile.isProfileComplete,
          isOnboardingComplete: !!profile.isOnboardingComplete,
        }
      : null;

    // Choose redirect by completion status when available
    const redirectTo = isNewUser
      ? "/profile/create"
      : profilePayload && profilePayload.isProfileComplete
        ? "/search"
        : "/profile/create";

    // Create response with consistent structure and stable gating flags
    const response = NextResponse.json({
      status: isNewUser ? "success" : "ok",
      message: isNewUser
        ? "Account created successfully"
        : "Signed in successfully",
      token: accessToken, // Include token in response body for AuthProvider
      user: {
        id: user._id,
        email: user.email,
        role: user.role || "user",
        name: name || "",
        profile: profilePayload,
      },
      isNewUser,
      redirectTo: isNewUser ? "/success" : redirectTo,
      refreshed: false,
    });

    // Set cookies using centralized helper (parity with native routes)
    const { getAuthCookieAttrs, getPublicCookieAttrs } = await import("@/lib/auth/cookies");

    // Set access token cookie (15 minutes)
    response.headers.set(
      "Set-Cookie",
      `auth-token=${accessToken}; ${getAuthCookieAttrs(60 * 15)}`
    );

    // Append refresh token cookie (7 days)
    response.headers.append(
      "Set-Cookie",
      `refresh-token=${refreshToken}; ${getAuthCookieAttrs(60 * 60 * 24 * 7)}`
    );

    // Remove public token cookie by default to avoid exposing access token to JS.
    // If absolutely required for legacy clients, gate behind feature flag SHORT_PUBLIC_TOKEN=1 with 60s TTL.
    if (process.env.SHORT_PUBLIC_TOKEN === "1") {
      response.headers.append(
        "Set-Cookie",
        `authTokenPublic=${accessToken}; ${getPublicCookieAttrs(60)}`
      );
    }

    // Clear state cookie after successful validation to enforce one-time use
    // Use helper for consistent attributes; Max-Age=0 to expire immediately
    {
      const { getAuthCookieAttrs } = await import("@/lib/auth/cookies");
      // getAuthCookieAttrs will include HttpOnly; we override Max-Age=0 by constructing string manually
      const expiredAttrs = getAuthCookieAttrs(0).replace(/Max-Age=\d+/, "Max-Age=0");
      response.headers.append("Set-Cookie", `oauth_state=; ${expiredAttrs}`);
    }

    return response;
  } catch (error: unknown) {
    // PII-safe logging: do not log tokens or payloads
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn("Google auth failure:", { message: errMsg });

    // Zod input validation errors
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

    // Normalize common Google OAuth errors (PII safe)
    const lower = errMsg.toLowerCase();

    // invalid_grant: token invalid/expired/redeemed
    if (lower.includes("invalid_grant")) {
      return NextResponse.json(
        {
          error: "Google token invalid or expired",
          code: "INVALID_GRANT",
          action:
            "Please retry sign-in. If the issue persists, refresh the page and try again.",
        },
        { status: 400 }
      );
    }

    // Token already used / replay
    if (
      lower.includes("used") ||
      lower.includes("already been used") ||
      lower.includes("jwt reused")
    ) {
      return NextResponse.json(
        {
          error: "Google token was already used",
          code: "TOKEN_REPLAY",
          action: "Please retry sign-in to obtain a fresh token.",
        },
        { status: 400 }
      );
    }

    // Clock skew / issued-at / not-before / iat/nbf/exp mismatches
    if (
      lower.includes("clock") ||
      lower.includes("skew") ||
      lower.includes("nbf") ||
      lower.includes("iat") ||
      lower.includes("exp") ||
      lower.includes("token used too early") ||
      lower.includes("token expired")
    ) {
      // If an upstream Retry-After header was provided (rare in OAuth), surface a hint
      const retryAfter =
        typeof error === "object" &&
        error !== null &&
        Object.prototype.hasOwnProperty.call(error, "retryAfter")
          ? (error as Record<string, unknown>).retryAfter as number | undefined
          : undefined;
      return NextResponse.json(
        {
          error: "Time synchronization issue detected",
          code: "CLOCK_SKEW",
          action: "Please check your device time and retry sign-in.",
          retryAfter,
        },
        { status: 400 }
      );
    }

    // Generic invalid token mapping
    if (
      lower.includes("invalid token") ||
      lower.includes("malformed") ||
      lower.includes("signature")
    ) {
      return NextResponse.json(
        {
          error: "Google token invalid",
          code: "INVALID_TOKEN",
          action: "Please retry sign-in.",
        },
        { status: 400 }
      );
    }

    // Fallback
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
