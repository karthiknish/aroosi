import { NextResponse } from "next/server";

// Login is handled by native authentication. Use /api/auth/signin instead.
// This endpoint is deprecated and kept for backward compatibility.

export async function POST() {
  return NextResponse.json({
    message:
      "Login is handled by native authentication. Use /api/auth/signin for authentication.",
  });
}
