import { NextRequest, NextResponse } from "next/server";

// Handler for Google OAuth initiation - returns error since Google provider is disabled
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: "Google sign in is temporarily disabled" },
    { status: 501 }
  );
}