import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// NOTE: We avoid importing missing jwt helpers. We inline minimal cookie setting based on server logic.
// If you have jwt helpers available, swap the cookie creation logic to use them.

const googleAuthSchema = z.object({
  credential: z.string(),
  state: z.string().min(16, "Missing or invalid state"),
});

const oauthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const c = part.trim();
    if (!c) continue;
    const idx = c.indexOf("=");
    const k = idx >= 0 ? c.slice(0, idx) : c;
    const v = idx >= 0 ? decodeURIComponent(c.slice(idx + 1)) : "";
    out[k] = v;
  }
  return out;
}

// Minimal HS256 JWT creation using Web Crypto; replace with your centralized util if you have one.
async function signJwtHS256(
  payload: Record<string, unknown>,
  secret: string,
  expSeconds: number
) {
  const enc = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const toB64Url = (u8: Uint8Array) =>
    Buffer.from(u8)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const encB64 = (obj: unknown) => toB64Url(enc.encode(JSON.stringify(obj)));

  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expSeconds };
  const data = `${encB64(header)}.${encB64(body)}`;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(data))
  );
  const signature = toB64Url(sig);
  return `${data}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, state } = googleAuthSchema.parse(body);

    // State validation
    const cookies = parseCookies(request.headers.get("cookie"));
    if (!cookies["oauth_state"] || cookies["oauth_state"] !== state) {
      return NextResponse.json(
        { error: "Invalid OAuth state", code: "INVALID_STATE" },
        { status: 400 }
      );
    }

    // Resolve identity
    let email = "";
    let name = "";
    let emailVerified = false;
    let googleId = "";

    let isUserInfo = false;
    try {
      const ui = JSON.parse(credential) as {
        sub?: string;
        id?: string;
        email?: string;
        name?: string;
        verified_email?: boolean;
      };
      if (ui && ui.email && typeof ui.verified_email !== "undefined") {
        email = ui.email || "";
        name = ui.name || "";
        emailVerified = ui.verified_email === true;
        googleId = ui.sub || ui.id || ui.email || "";
        isUserInfo = true;
      }
    } catch {
      // not userinfo JSON
    }

    if (!isUserInfo) {
      const ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        return NextResponse.json(
          { error: "Invalid Google token" },
          { status: 400 }
        );
      }
      const validIssuers = new Set([
        "https://accounts.google.com",
        "accounts.google.com",
      ]);
      if (!payload.iss || !validIssuers.has(payload.iss)) {
        return NextResponse.json(
          { error: "Invalid token issuer" },
          { status: 400 }
        );
      }
      const allowedAud = (
        process.env.GOOGLE_ALLOWED_CLIENT_IDS ||
        process.env.GOOGLE_CLIENT_ID ||
        ""
      )
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!payload.aud || !allowedAud.includes(payload.aud)) {
        return NextResponse.json(
          { error: "Invalid token audience" },
          { status: 400 }
        );
      }
      if (payload.azp && !allowedAud.includes(payload.azp)) {
        return NextResponse.json(
          { error: "Invalid authorized party" },
          { status: 400 }
        );
      }

      email = String(payload.email || "");
      name = String(payload.name || "");
      emailVerified = payload.email_verified === true;
      googleId = String(payload.sub || payload.email || "");
    }

    if (!email) {
      return NextResponse.json(
        { error: "Google account did not provide an email" },
        { status: 400 }
      );
    }
    if (!emailVerified) {
      return NextResponse.json(
        { error: "Email not verified with Google" },
        { status: 400 }
      );
    }
    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user in Convex
    const existingUser = (await fetchQuery(api.users.getUserByEmail, {
      email: normalizedEmail,
    }).catch(() => null)) as any;

    if (existingUser?.banned) {
      return NextResponse.json(
        { error: "Account is banned", code: "USER_BANNED" },
        { status: 403 }
      );
    }

    let userId: Id<"users">;
    let role = (existingUser?.role as string) || "user";
    if (existingUser?._id) {
      userId = existingUser._id as Id<"users">;
    } else {
      const createdId = (await fetchMutation(api.users.createUserAndProfile, {
        email: normalizedEmail,
        name,
        googleId,
      }).catch(() => null)) as Id<"users"> | null;
      if (!createdId) {
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 }
        );
      }
      userId = createdId as Id<"users">;
      role = "user";
    }

    const profile = (await fetchQuery(api.users.getProfileByUserIdPublic, {
      userId,
    }).catch(() => null)) as any;
    const profilePayload = profile
      ? {
          id: String(profile._id || ""),
          isProfileComplete: !!profile.isProfileComplete,
          isOnboardingComplete: !!profile.isOnboardingComplete,
        }
      : null;

    // Create cookie-session compatible JWT cookies (temporary: inline HS256 signing)
    const isProd = process.env.NODE_ENV === "production";
    const prefix = isProd ? "__Secure-" : "";
    const accessSecret =
      process.env.JWT_ACCESS_SECRET || "dev-access-secret-change";
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change";
    const iss = process.env.JWT_ISSUER || "aroosi";
    const accessAud = process.env.JWT_ACCESS_AUD || "aroosi:web";
    const refreshAud = process.env.JWT_REFRESH_AUD || "aroosi:refresh";

    const accessJwt = await signJwtHS256(
      {
        userId: String(userId),
        email: normalizedEmail,
        role,
        iss,
        aud: accessAud,
        typ: "access",
      },
      accessSecret,
      15 * 60
    );
    const refreshJwt = await signJwtHS256(
      {
        userId: String(userId),
        email: normalizedEmail,
        role,
        iss,
        aud: refreshAud,
        typ: "refresh",
        ver: 0,
      },
      refreshSecret,
      7 * 24 * 60 * 60
    );

    const accessCookie = `${prefix}auth-token=${encodeURIComponent(accessJwt)}; Path=/; HttpOnly; SameSite=Lax${
      isProd ? "; Secure" : ""
    }; Max-Age=900`;
    const refreshCookie = `${prefix}refresh-token=${encodeURIComponent(refreshJwt)}; Path=/; HttpOnly; SameSite=Lax${
      isProd ? "; Secure" : ""
    }; Max-Age=${7 * 24 * 60 * 60}`;

    const res = NextResponse.json(
      {
        success: true,
        user: {
          id: String(userId),
          email: normalizedEmail,
          role,
          profile: profilePayload,
        },
        redirectTo:
          profilePayload && profilePayload.isProfileComplete
            ? "/search"
            : "/profile/create",
      },
      { headers: { "Set-Cookie": `${accessCookie}, ${refreshCookie}` } }
    );
    return res;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to sign in with Google", details: msg },
      { status: 400 }
    );
  }
}
