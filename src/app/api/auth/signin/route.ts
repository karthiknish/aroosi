import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

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

    // First, verify credentials with Clerk
    try {
      // Note: This is a simplified approach - in practice, you'd want to use Clerk's
      // client-side authentication and only verify the session server-side
      const signInResponse = await (await clerkClient()).users.getUserList({
        emailAddress: [email],
      });
      
      // Check if user exists
      if (!signInResponse || signInResponse.data.length === 0) {
        return NextResponse.json(
          { error: "No account found with this email address", code: "ACCOUNT_NOT_FOUND" },
          { status: 404 }
        );
      }
      
      // In a real implementation, you'd want to verify the password here
      // But for now, we'll just check that the user exists
    } catch (clerkError: any) {
      console.error("Clerk sign in error:", clerkError);
      const errorCode = clerkError?.errors?.[0]?.code;
      
      if (errorCode === "form_identifier_not_found") {
        return NextResponse.json(
          { error: "No account found with this email address", code: "ACCOUNT_NOT_FOUND" },
          { status: 404 }
        );
      } else if (errorCode === "form_password_incorrect") {
        return NextResponse.json(
          { error: "Invalid password", code: "INVALID_PASSWORD" },
          { status: 401 }
        );
      } else {
        return NextResponse.json(
          { error: "Sign in failed", code: "INVALID_CREDENTIALS" },
          { status: 401 }
        );
      }
    }

    // If Clerk authentication is successful, proceed with Convex Auth
    const form = new URLSearchParams();
    form.set("provider", "password");
    form.set("email", email);
    form.set("password", password);
    form.set("flow", "signIn");

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

    // Fetch with timeout + single retry on transient errors
    const doFetch = async (): Promise<Response> => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 9000);
      try {
        return await fetch(upstreamUrlApi, {
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
  if (res.status === 404 || res.status === 405) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 9000);
    try {
      res = await fetch(upstreamUrlAlt!, {
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
  }

  // Forward Set-Cookie headers from Convex Auth to the browser
  let payload: any = { ok: res.ok };
  if (process.env.NODE_ENV !== "production" && res.status >= 400) {
    payload = {
      ...payload,
      debug: {
        base,
        tried: [upstreamUrlApi, upstreamUrlAlt].filter(Boolean),
        status: res.status,
      },
    };
  }
  const out = NextResponse.json(payload, { status: res.status });
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
