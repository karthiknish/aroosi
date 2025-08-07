import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { convexMutationWithAuth } from "@/lib/convexServer";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    await requireAuth(request);
    const result = await convexMutationWithAuth(
      request,
      api.users.boostProfile,
      {} as any
    );
    return NextResponse.json({ success: true, ...result, correlationId });
  } catch (err: any) {
    const status = err instanceof AuthError ? err.status : 400;
    const error = err instanceof AuthError ? err.message : (err?.message || "Boost failed");
    const code = err instanceof AuthError ? err.code : err?.code;
    return NextResponse.json({ success: false, error, code, correlationId }, { status });
  }
}
