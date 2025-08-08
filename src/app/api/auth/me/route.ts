// This route is now handled by Convex Auth's built-in endpoint.
// Please GET /api/auth/me (Convex Auth) instead.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Please use Convex Auth's /api/auth/me endpoint. This endpoint is deprecated.",
  });
}
