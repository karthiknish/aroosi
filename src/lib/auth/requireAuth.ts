import { NextRequest } from "next/server";
import { verifyAccessJWT } from "@/lib/auth/jwt";

export type AuthPayload = {
  userId: string;
  email?: string;
  role?: string;
};

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 401, code = "ACCESS_INVALID") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function requireAuth(req: NextRequest): Promise<AuthPayload> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new AuthError("Missing Authorization header", 401, "ACCESS_INVALID");
  }
  const token = header.slice(7).trim();
  if (!token) throw new AuthError("Missing token", 401, "ACCESS_INVALID");
  try {
    const payload = await verifyAccessJWT(token);
    if (!payload?.userId) throw new Error("Invalid token payload");
    return payload as AuthPayload;
  } catch (e) {
    throw new AuthError("Invalid or expired access token", 401, "ACCESS_INVALID");
  }
}
