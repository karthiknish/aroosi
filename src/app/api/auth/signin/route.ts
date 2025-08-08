import { NextRequest, NextResponse } from "next/server";

function maskEmail(email?: string) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  const first = name?.[0] || "*";
  return `${first}***@${domain}`;
}

function reqMeta(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const xfwd = request.headers.get("x-forwarded-for") || "";
  const ip = xfwd.split(",")[0]?.trim();
  return {
    method: request.method,
    url: request.nextUrl?.pathname,
    contentType,
    ip,
    referer: request.headers.get("referer") || undefined,
    ua: request.headers.get("user-agent") || undefined,
  };
}

// Bridge legacy POST /api/auth/signin to Convex Auth Password provider.
// Expects JSON { email, password } and forwards to /api/auth/password with flow=signIn.
export async function POST(request: NextRequest) {
  try {
    console.info("[auth:signin] request", reqMeta(request));
    const { email, password } = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      console.warn("[auth:signin] missing credentials", {
        email: maskEmail(email),
      });
      return NextResponse.json(
        { error: "Missing email or password", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const form = new URLSearchParams();
    form.set("provider", "password");
    form.set("email", email);
    form.set("password", password);
    form.set("flow", "signIn");

    const base =
      process.env.CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    const upstreamUrl = `${base}/api/auth`;
    if (!base) {
      console.error(
        "[auth:signin] CONVEX_SITE_URL & NEXT_PUBLIC_CONVEX_URL not set"
      );
      return NextResponse.json(
        { error: "Server misconfiguration", code: "ENV_MISSING" },
        { status: 500 }
      );
    }

    console.info("[auth:signin] proxy ->", upstreamUrl, {
      flow: "signIn",
      email: maskEmail(email),
      base,
    });
    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
      redirect: "manual",
    });

    // Forward Set-Cookie headers from Convex Auth to the browser
    const out = NextResponse.json({ ok: res.ok }, { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    const cookieCount = setCookie ? setCookie.split(/,(?=[^;]+?=)/g).length : 0;
    console.info("[auth:signin] upstream response", {
      status: res.status,
      ok: res.ok,
      cookieCount,
    });
    if (setCookie) {
      for (const c of setCookie.split(/,(?=[^;]+?=)/g)) {
        out.headers.append("Set-Cookie", c);
      }
    }
    return out;
  } catch (e) {
    console.error("[auth:signin] error", e);
    return NextResponse.json(
      { error: "Sign in failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
