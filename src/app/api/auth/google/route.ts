import { NextRequest, NextResponse } from "next/server";

// Handler for Google OAuth initiation - redirects to Convex Auth
export async function GET(request: NextRequest) {
  try {
    // Resolve Convex Auth base URL
    const siteBaseRaw = process.env.CONVEX_SITE_URL || undefined;
    const cloud = process.env.NEXT_PUBLIC_CONVEX_URL || undefined;
    const raw = siteBaseRaw || cloud;
    const normalized = raw ? raw.replace(/\/+$/, "") : undefined;
    const base = normalized
      ? normalized.includes(".convex.cloud")
        ? normalized.replace(".convex.cloud", ".convex.site")
        : normalized
      : undefined;
    const upstreamUrlApi = base ? `${base}/api/auth/signin/google` : undefined;

    if (!base || !upstreamUrlApi) {
      return NextResponse.json(
        { error: "Server misconfiguration", code: "ENV_MISSING" },
        { status: 500 }
      );
    }

    // Redirect to Convex Auth Google OAuth flow
    return NextResponse.redirect(upstreamUrlApi, { status: 302 });
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google sign in" },
      { status: 500 }
    );
  }
}