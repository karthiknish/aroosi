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
    console.info("[auth:password] request", reqMeta(request));
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
      console.warn("[auth:password] missing credentials", {
        email: maskEmail(email),
      });
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

    const base =
      process.env.CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    const upstreamUrl = `${base}/api/auth`;
    if (!base) {
      console.error(
        "[auth:password] CONVEX_SITE_URL & NEXT_PUBLIC_CONVEX_URL not set"
      );
      return NextResponse.json(
        { error: "Server misconfiguration", code: "ENV_MISSING" },
        { status: 500 }
      );
    }
    console.info("[auth:password] proxy ->", upstreamUrl, {
      flow,
      email: maskEmail(email),
      base,
    });
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });

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
      const cookieCount = setCookie.split(/,(?=[^;]+?=)/g).length;
      console.info("[auth:password] upstream response", {
        status: upstream.status,
        ok: upstream.ok,
        cookieCount,
      });
      for (const c of setCookie.split(/,(?=[^;]+?=)/g)) {
        res.headers.append("Set-Cookie", c);
      }
    }
    return res;
  } catch (e) {
    console.error("[auth:password] error", e);
    return NextResponse.json(
      { error: "Auth failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
