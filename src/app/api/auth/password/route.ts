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

// Bridge POST /api/auth/password to Convex Auth Password provider.
// Accepts form-data or x-www-form-urlencoded with { email, password, flow }.
export async function POST(request: NextRequest) {
  try {
    // Removed info log for lint
    let email = "";
    let password = "";
    let flow = "signIn";

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      email = (params.get("email") || "").toString();
      password = (params.get("password") || "").toString();
      flow = (params.get("flow") || flow).toString();
    } else if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      email = String(form.get("email") || "");
      password = String(form.get("password") || "");
      flow = String(form.get("flow") || flow);
    } else if (contentType.includes("application/json")) {
      const {
        email: e,
        password: p,
        flow: f,
      } = (await request.json().catch(() => ({}))) as {
        email?: string;
        password?: string;
        flow?: string;
      };
      email = e || "";
      password = p || "";
      flow = f || flow;
    }

    if (!email || !password) {
      // Removed warn log for lint
      return NextResponse.json(
        { error: "Missing email or password", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.set("provider", "password");
    body.set("email", email);
    body.set("password", password);
    body.set("flow", flow);

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
    // Perform fetch with a short timeout and a single retry on transient errors.
    const doFetch = async (): Promise<Response> => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 9000);
      try {
        return await fetch(upstreamUrl, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
          redirect: "manual",
          signal: controller.signal,
          cache: "no-store",
        });
      } finally {
        clearTimeout(t);
      }
    };

    let upstream: Response;
    try {
      upstream = await doFetch();
    } catch (err) {
      // Retry once on network/timeout errors
      upstream = await doFetch();
    }

    // Clone upstream JSON if possible; but we only need to pass ok + status by default
    let payload: any = { ok: upstream.ok };
    try {
      payload = await upstream.json();
    } catch {
      // keep default payload
    }

    const res = NextResponse.json(payload, { status: upstream.status });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
          // Removed info log for lint
      for (const c of setCookie.split(/,(?=[^;]+?=)/g)) {
        res.headers.append("Set-Cookie", c);
      }
    }
    return res;
  } catch (e) {
    // Removed error log for lint
    return NextResponse.json(
      { error: "Auth failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
