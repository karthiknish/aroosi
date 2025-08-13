// Deprecated: Password reset is handled via Clerk's reset_password_email_code flow on the client.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use Clerk reset_password_email_code client flow.",
    },
    { status: 410 }
  );
}
