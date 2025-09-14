import { NextRequest, NextResponse } from "next/server";
import { sendPasswordChangedEmail } from "@/lib/auth/email";

// Called after a successful password change to notify user
export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json().catch(() => ({}))) as { email?: string };
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || new URL(request.url).origin;
    const loginUrl = `${baseUrl}/sign-in`;
    await sendPasswordChangedEmail(email, loginUrl).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}


