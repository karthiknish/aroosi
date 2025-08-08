import { NextRequest, NextResponse } from "next/server";

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
    } else if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      email = String(form.get("email") || "");
      password = String(form.get("password") || "");
      flow = String(form.get("flow") || flow);
    } else if (contentType.includes("application/json")) {
      const { email: e, password: p, flow: f } = (await request.json().catch(() => ({}))) as {
        email?: string;
        password?: string;
        flow?: string;
      };
      email = e || "";
      password = p || "";
      flow = f || flow;
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.set("email", email);
    body.set("password", password);
    body.set("flow", flow);

    const upstream = await fetch(
      `${process.env.NEXT_PUBLIC_CONVEX_URL}/api/auth/password`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        redirect: "manual",
      }
    );

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
      for (const c of setCookie.split(/,(?=[^;]+?=)/g)) {
        res.headers.append("Set-Cookie", c);
      }
    }
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: "Auth failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
