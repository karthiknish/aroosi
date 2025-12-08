import { NextRequest } from "next/server";
import { headers } from "next/headers";
import {
  verifyFirebaseIdToken,
  getUserByEmail,
  upsertUser,
} from "@/lib/firebaseAdmin";
import { successResponse, errorResponse } from "@/lib/apiResponse";

/**
 * Structured logger to keep logs consistent and searchable.
 */
function log(
  scope: string,
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>
) {
  const payload = {
    scope,
    level,
    message,
    ts: new Date().toISOString(),
    ...(extra && Object.keys(extra).length > 0 ? { extra } : {}),
  };
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(payload);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(payload);
  } else {
    // eslint-disable-next-line no-console
    console.log(payload);
  }
}

/**
 * Normalize unknown errors for consistent API responses and logs.
 */
function toErrorDetails(err: unknown): { message: string; code?: string } {
  if (typeof err === "object" && err !== null) {
    const code = (err as any)?.code as string | undefined;
    const message =
      (err as any)?.message ?? (err as any)?.error ?? "Unexpected server error";
    return { message: String(message), ...(code ? { code } : {}) };
  }
  return { message: String(err) };
}

export async function GET(_request: NextRequest) {
  const scope = "api/user/me#GET";
  // Expect Firebase ID token via Authorization: Bearer <token> or x-firebase-token
  let idToken: string | null = null;
  try {
    const h = await (headers() as unknown as Promise<Headers>);
    const authHeader = h.get("authorization") || h.get("Authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      idToken = authHeader.slice(7).trim();
    } else {
      idToken = h.get("x-firebase-token");
    }
  } catch {}
  if (!idToken) {
    log(scope, "warn", "Missing Firebase token");
    return successResponse({ profile: null });
  }
  let decoded: any = null;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch (e) {
    log(scope, "warn", "Invalid token", { error: (e as Error)?.message });
    return successResponse({ profile: null });
  }
  const email = (decoded?.email || "").toLowerCase();
  if (!email) {
    log(scope, "warn", "Token missing email");
    return successResponse({ profile: null });
  }
  try {
    const existing = await getUserByEmail(email);
    if (!existing) return successResponse({ profile: null });
    return successResponse({ profile: existing });
  } catch (error) {
    const details = toErrorDetails(error);
    log(scope, "error", "Unhandled GET error", details);
    return errorResponse("Failed to fetch user profile", 500, { details });
  }
}

export async function PUT(request: NextRequest) {
  const scope = "api/user/me#PUT";
  let idToken: string | null = null;
  try {
    const h = await (headers() as unknown as Promise<Headers>);
    const authHeader = h.get("authorization") || h.get("Authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      idToken = authHeader.slice(7).trim();
    } else {
      idToken = h.get("x-firebase-token");
    }
  } catch {}
  if (!idToken) return errorResponse("Unauthorized", 401);
  let decoded: any = null;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch (e) {
    log(scope, "warn", "Invalid token", { error: (e as Error)?.message });
    return errorResponse("Unauthorized", 401);
  }
  const email = (decoded?.email || "").toLowerCase();
  if (!email) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch (jsonError) {
    log(scope, "warn", "Invalid JSON body", {
      error: (jsonError as Error)?.message,
    });
    return errorResponse("Invalid JSON body", 400);
  }
  if (typeof body !== "object" || body === null)
    return errorResponse("Invalid payload", 400);
  try {
    const updated = await upsertUser(email, {
      ...(body as any),
      email,
      updatedAt: Date.now(),
    });
    log(scope, "info", "Firestore upsert success");
    return successResponse({ profile: updated });
  } catch (e) {
    log(scope, "error", "Firestore upsert failed", {
      error: (e as Error)?.message,
    });
    return errorResponse("Failed to update user profile", 500);
  }
}