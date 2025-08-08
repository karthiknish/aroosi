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
    // Removed info log for lint
    const { email, password } = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      // Removed warn log for lint
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

    // Resolve Convex Auth base URL. Prefer CONVEX_SITE_URL (.site). If only
    // NEXT_PUBLIC_CONVEX_URL (.cloud) is provided, derive the .site host.
    const siteBase = process.env.CONVEX_SITE_URL;
    const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
    const derivedSite = cloud?.includes(".convex.cloud")
      ? cloud.replace(".convex.cloud", ".convex.site")
      : undefined;
    const base = siteBase || derivedSite || undefined;
    const upstreamUrl = base ? `${base}/api/auth` : undefined;
    if (!base || !upstreamUrl) {
      // Removed error log for lint
      return NextResponse.json(
        { error: "Server misconfiguration", code: "ENV_MISSING" },
        { status: 500 }
      );
    }

    // Fetch with timeout + single retry on transient errors
    const doFetch = async (): Promise<Response> => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 9000);
      try {
        return await fetch(upstreamUrl, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: form,
          redirect: "manual",
          signal: controller.signal,
          cache: "no-store",
        });
      } finally {
        clearTimeout(t);
      }
    };
    let res: Response;
    try {
      res = await doFetch();
    } catch {
      res = await doFetch();
    }

    // Forward Set-Cookie headers from Convex Auth to the browser
    const out = NextResponse.json({ ok: res.ok }, { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    const cookieCount = setCookie ? setCookie.split(/,(?=[^;]+?=)/g).length : 0;
    // Removed info log for lint
    if (setCookie) {
      for (const c of setCookie.split(/,(?=[^;]+?=)/g)) {
        out.headers.append("Set-Cookie", c);
      }
    }
    return out;
  } catch (e) {
    // Removed error log for lint
    return NextResponse.json(
      { error: "Sign in failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
