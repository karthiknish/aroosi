import { NextRequest, NextResponse } from "next/server";

// Bridge legacy POST /api/auth/signin to Convex Auth Password provider.
// Expects JSON { email, password } and forwards to /api/auth/password with flow=signIn.
export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const form = new URLSearchParams();
    form.set("email", email);
    form.set("password", password);
    form.set("flow", "signIn");

    const res = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/auth/password`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
      redirect: "manual",
    });

    // Forward Set-Cookie headers from Convex Auth to the browser
    const out = NextResponse.json({ ok: res.ok }, { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      for (const c of setCookie.split(/,(?=[^;]+?=)/g)) {
        out.headers.append("Set-Cookie", c);
      }
    }
    return out;
  } catch (e) {
    return NextResponse.json(
      { error: "Sign in failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
