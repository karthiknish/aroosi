import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import {
  convexMutationWithAuth,
  convexQueryWithAuth,
} from "@/lib/convexServer";

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

    // recordProfileView now infers viewer via Convex identity; do not pass viewerUserId
    await convexMutationWithAuth(request, api.users.recordProfileView, {
      profileId: profileId as Id<"profiles">,
    } as any);

    return NextResponse.json({ success: true, correlationId });
  } catch (err: any) {
    const status = err instanceof AuthError ? err.status : err?.status ?? 400;
    const error =
      err instanceof AuthError
        ? err.message
        : err?.error ?? (err instanceof Error ? err.message : "Failed to record view");
    const code = err instanceof AuthError ? err.code : err?.code;
    return NextResponse.json({ success: false, error, code, correlationId }, { status });
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

    // Convex enforces authorization; requesterUserId parameter is not required when using subject-based identity
    const viewers = await convexQueryWithAuth(
      request,
      api.users.getProfileViewers,
      {
        profileId: profileId as Id<"profiles">,
      } as any
    );

    return NextResponse.json({ success: true, viewers, correlationId });
  } catch (err: any) {
    const status = err instanceof AuthError ? err.status : err?.status ?? 400;
    const error =
      err instanceof AuthError
        ? err.message
        : err?.error ?? (err instanceof Error ? err.message : "Failed to fetch viewers");
    const code = err instanceof AuthError ? err.code : err?.code;
    return NextResponse.json({ success: false, error, code, correlationId }, { status });
  }
}
