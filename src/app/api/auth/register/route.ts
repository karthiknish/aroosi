import { NextRequest, NextResponse } from "next/server";

// Registration is handled by Clerk. This endpoint expects a valid Clerk JWT.
// You can optionally validate the JWT here or just return a message.

export async function POST(req: NextRequest) {
  return NextResponse.json({
    message:
      "Registration is handled by Clerk. Send your credentials to Clerk and use the JWT for authenticated requests.",
  });
}
