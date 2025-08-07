import { NextRequest, NextResponse } from "next/server";

// Minimal JWT helpers without external deps (HS256)
// NOTE: Replace with your existing project JWT utilities if available.
import crypto from "node:crypto";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "dev_access_secret_change_me";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "dev_refresh_secret_change_me";

type TokenPayload = {
  sub: string; // user id
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

// Base64 URL helpers
function b64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signHS256(payload: Record<string, unknown>, secret: string, expiresInSec: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSec;
  const body = { ...payload, iat, exp };

  const headerPart = b64url(JSON.stringify(header));
  const payloadPart = b64url(JSON.stringify(body));
  const data = `${headerPart}.${payloadPart}`;

  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const sigPart = b64url(sig);

  return `${data}.${sigPart}`;
}

function verifyHS256(token: string, secret: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, sigPart] = parts;

  const data = `${headerPart}.${payloadPart}`;
  const expected = b64url(crypto.createHmac("sha256", secret).update(data).digest());
  if (expected !== sigPart) return null;

  try {
    const json = JSON.parse(Buffer.from(payloadPart.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (json.exp && now >= json.exp) return null;
    return json;
  } catch {
    return null;
  }
}

// Issue tokens
function issueAccessToken(payload: TokenPayload): string {
  // Typically 5–15 minutes
  return signHS256(payload, ACCESS_TOKEN_SECRET, 15 * 60);
}

function issueRefreshToken(payload: TokenPayload): string {
  // Typically 7–30 days
  return signHS256(payload, REFRESH_TOKEN_SECRET, 30 * 24 * 60 * 60);
}

// Extracts the Bearer token from Authorization header
function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

// Optionally: load user or validate status (banned, deleted) from DB
// Replace this with actual DB lookup if your security model requires it.
async function loadUserById(userId: string): Promise<{ id: string; email?: string; role?: string; banned?: boolean } | null> {
  // TODO: Wire to your user store
  return { id: userId };
}

export async function POST(req: NextRequest) {
  try {
    const refreshToken = getBearerToken(req);
    if (!refreshToken) {
      return NextResponse.json({ error: "Missing refresh token" }, { status: 400 });
    }

    const payload = verifyHS256(refreshToken, REFRESH_TOKEN_SECRET);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    const userId = typeof payload.sub === "string" ? payload.sub : undefined;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    // Optional: Check user still valid
    const user = await loadUserById(userId);
    if (!user || (user as any).banned) {
      return NextResponse.json({ error: "User not allowed" }, { status: 403 });
    }

    const newAccessToken = issueAccessToken({
      sub: user.id,
      email: (user as any).email,
      role: (user as any).role,
    });

    const newRefreshToken = issueRefreshToken({
      sub: user.id,
      email: (user as any).email,
      role: (user as any).role,
    });

    return NextResponse.json(
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Refresh error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// For parity, reject GET (or you can support if desired)
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
