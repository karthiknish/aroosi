import { NextRequest, NextResponse } from "next/server";
import { convex } from "../../../../lib/convexClient";
import { api } from "@convex/_generated/api";

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
    } else {
      // Handle FormData (multipart/form-data) and other content types
      try {
        const formData = await request.formData();
        email = String(formData.get("email") || "");
        password = String(formData.get("password") || "");
        flow = String(formData.get("flow") || flow);
      } catch (formDataError) {
        // If formData parsing fails, try to parse as JSON
        try {
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
        } catch (jsonError) {
          // If both fail, we'll use the default empty values
        }
      }
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // Forward to Convex Auth Password provider
    const form = new URLSearchParams();
    form.set("provider", "password");
    form.set("email", email);
    form.set("password", password);
    form.set("flow", flow);

    // Resolve Convex Auth base URL
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

    if (!base || !upstreamUrlApi) {
      return NextResponse.json(
        { error: "Server misconfiguration", code: "ENV_MISSING" },
        { status: 500 }
      );
    }

    // Make request to Convex Auth
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(upstreamUrlApi, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form,
        redirect: "manual",
        signal: controller.signal,
        cache: "no-store",
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
    } finally {
      clearTimeout(t);
    }
  } catch (e: any) {
    console.error("Sign in error:", e);
    return NextResponse.json(
      { error: "Auth failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
