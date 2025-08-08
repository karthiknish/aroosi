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
    const siteBaseRaw = process.env.CONVEX_SITE_URL || undefined;
    const cloud = process.env.NEXT_PUBLIC_CONVEX_URL || undefined;
    const raw = siteBaseRaw || cloud;
    const normalized = raw ? raw.replace(/\/+$/, "") : undefined;
    const base = normalized
      ? normalized.includes(".convex.cloud")
        ? normalized.replace(".convex.cloud", ".convex.site")
        : normalized
      : undefined;
    const upstreamUrlApi = base ? `${base}/api/auth` : undefined;
    const upstreamUrlAlt = base ? `${base}/auth` : undefined;
    if (!base || !upstreamUrlApi) {
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
        return await fetch(upstreamUrlApi, {
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
    // If the endpoint isn't mounted at /api/auth (returns 404/405), try /auth once.
    if (upstream.status === 404 || upstream.status === 405) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 9000);
      try {
        upstream = await fetch(upstreamUrlAlt!, {
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
    }

    // Clone upstream JSON if possible; but we only need to pass ok + status by default
    let payload: any = { ok: upstream.ok };
    try {
      payload = await upstream.json();
    } catch {
      // keep default payload
    }

    // In development, include minimal diagnostics to debug 404/405s
    if (process.env.NODE_ENV !== "production" && upstream.status >= 400) {
      payload = {
        ...payload,
        debug: {
          base,
          tried: [upstreamUrlApi, upstreamUrlAlt].filter(Boolean),
          status: upstream.status,
        },
      };
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
