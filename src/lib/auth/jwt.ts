import { SignJWT, jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "dev-access-secret-change",
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change",
);

// Expected issuer/audience
const ISSUER = process.env.JWT_ISSUER || "aroosi";
const ACCESS_AUDIENCE = process.env.JWT_ACCESS_AUD || "aroosi:web";
const REFRESH_AUDIENCE = process.env.JWT_REFRESH_AUD || "aroosi:refresh";

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
  typ?: "access" | "refresh";
  ver?: number; // for rotation/versioning if needed
}

export async function signAccessJWT(
  payload: Omit<JWTPayload, "iat" | "exp" | "typ">,
  expiresIn: string = "15m"
): Promise<string> {
  return await new SignJWT({ ...payload, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(ACCESS_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(ACCESS_SECRET);
}

export async function signRefreshJWT(
  payload: Omit<JWTPayload, "iat" | "exp" | "typ"> & { ver?: number },
  expiresIn: string = "7d"
): Promise<string> {
  // Ensure a numeric version is embedded for rotation checks; default to 0 if unset
  const ver = typeof payload.ver === "number" ? payload.ver : 0;
  return await new SignJWT({ ...payload, ver, typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(REFRESH_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, {
      issuer: ISSUER,
      audience: ACCESS_AUDIENCE,
    });
    if (payload.typ !== "access") throw new Error("Invalid token type");
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      iat: payload.iat,
      exp: payload.exp,
      typ: "access",
    };
  } catch (error) {
    throw new Error("Invalid access token");
  }
}

export async function verifyRefreshJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET, {
      issuer: ISSUER,
      audience: REFRESH_AUDIENCE,
    });
    if (payload.typ !== "refresh") throw new Error("Invalid token type");
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: (payload.role as string) || "user",
      iat: payload.iat,
      exp: payload.exp,
      typ: "refresh",
      ver: typeof payload.ver === "number" ? (payload.ver as number) : 0,
    };
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
