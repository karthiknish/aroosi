import { NextResponse } from "next/server";

// Deprecated: handled by Convex Auth. This stub exists to keep mobile apps from breaking.
export async function POST() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint. Use Convex Auth Google login.",
      next: "/api/auth/me",
    },
    { status: 410 }
  );
}
