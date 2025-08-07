// This route is now handled by Convex Auth's built-in endpoint.
// Please POST to /api/auth/logout (Convex Auth) instead.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    message:
      "Please use Convex Auth's /api/auth/logout endpoint. This endpoint is deprecated.",
  });
}
