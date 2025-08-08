import { NextResponse } from "next/server";

// Deprecated: Google OAuth is handled by Convex Auth configuration at /api/auth/*.
// This stub remains only for backward compatibility.
export async function POST() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint. Use Convex Auth Google login.",
      next: "/api/auth/me",
    },
    { status: 410 }
  );
}
