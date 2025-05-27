import { NextRequest, NextResponse } from "next/server";

// Login is handled by Clerk. This endpoint expects a valid Clerk JWT.
// You can optionally validate the JWT here or just return a message.

export async function POST(req: NextRequest) {
  return NextResponse.json({
    message:
      "Login is handled by Clerk. Send your credentials to Clerk and use the JWT for authenticated requests.",
  });
}
