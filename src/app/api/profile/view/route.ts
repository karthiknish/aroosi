import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Helpers: verify Authorization Bearer access token
 */
async function requireAuth(req: NextRequest): Promise<{ userId: string; email?: string; role?: string }> {
  const authz = req.headers.get("authorization") || "";
  if (!authz.toLowerCase().startsWith("bearer ")) {
    throw { status: 401, code: "ACCESS_INVALID", error: "Missing Authorization header" };
  }
  const token = authz.slice(7).trim();
  try {
    const { verifyAccessJWT } = await import("@/lib/auth/jwt");
    const payload = await verifyAccessJWT(token);
    if (!payload?.userId) {
      throw new Error("Invalid payload");
    }
    return payload as { userId: string; email?: string; role?: string };
  } catch (e) {
    throw { status: 401, code: "ACCESS_INVALID", error: "Invalid or expired access token" };
  }
}

/**
 * Convex server-side client (fetchQuery/fetchMutation) for App Router
 */
import { fetchMutation, fetchQuery } from "convex/nextjs";

/**
 * POST  /api/profile/view
 * Body: { profileId: string }
 * Records that the authenticated user viewed the given profile.
 */
export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const { userId } = await requireAuth(request);

    const body = await request.json().catch(() => ({} as any));
    const { profileId } = (body ?? {}) as { profileId?: string };

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "Missing profileId", correlationId },
        { status: 400 }
      );
    }

    await fetchMutation(api.users.recordProfileView, {
      profileId,
      viewerUserId: userId as unknown as Id<"users">, // if mutation expects, else ignore param in Convex
    } as any);

    return NextResponse.json({ success: true, correlationId });
  } catch (err: any) {
    const status = err?.status ?? 400;
    const error = err?.error ?? (err instanceof Error ? err.message : "Failed to record view");
    return NextResponse.json({ success: false, error, code: err?.code, correlationId }, { status });
  }
}

/**
 * GET  /api/profile/view?profileId=xyz
 * Returns the list of viewers for the given profile (Premium Plus owner only).
 */
export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const { userId } = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "Missing profileId", correlationId },
        { status: 400 }
      );
    }

    // Fetch viewers (Convex should enforce authorization: only Premium Plus owner can view)
    const viewers = await fetchQuery(api.users.getProfileViewers, {
      profileId: profileId as Id<"profiles">,
      requesterUserId: userId as unknown as Id<"users">,
    } as any);

    return NextResponse.json({ success: true, viewers, correlationId });
  } catch (err: any) {
    const status = err?.status ?? 400;
    const error = err?.error ?? (err instanceof Error ? err.message : "Failed to fetch viewers");
    return NextResponse.json({ success: false, error, code: err?.code, correlationId }, { status });
  }
}
