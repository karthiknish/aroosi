import { NextResponse } from "next/server";

// Registration is handled by native authentication. Use /api/auth/signup instead.
// This endpoint is deprecated and kept for backward compatibility.

export async function POST() {
  return NextResponse.json({
    message:
      "Registration is handled by native authentication. Use /api/auth/signup for registration.",
  });
}
