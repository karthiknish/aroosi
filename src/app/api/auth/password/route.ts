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
      // Removed warn log for lint
      return NextResponse.json(
        { error: "Missing email or password", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    console.log("Calling signIn action with:", { email, flow });
    
    // Call the signIn action directly
    let result: { tokens?: { token: string } | null; } | undefined;
    try {
      result = await convex.action(api.auth.signIn, {
        provider: "password",
        params: {
          email,
          password,
          flow,
        },
      });
      console.log("SignIn result:", result);
    } catch (error: any) {
      console.error("SignIn error:", error);
      // Provide user-friendly error messages for common cases
      let errorMessage = "Authentication failed. Please try again.";
      let errorCode = "AUTH_FAILED";
      
      // Check if it's a specific Convex Auth error
      if (error?.message?.includes("InvalidAccountId")) {
        errorMessage = "No account found with this email address. Please check your email or sign up for a new account.";
        errorCode = "ACCOUNT_NOT_FOUND";
      } else if (error?.message?.includes("InvalidPassword")) {
        errorMessage = "Invalid password. Please check your password and try again.";
        errorCode = "INVALID_PASSWORD";
      }
      
      return NextResponse.json(
        { error: errorMessage, code: errorCode },
        { status: 401 }
      );
    }

    // Check if the sign in was successful
    if (!result?.tokens?.token) {
      console.log("No tokens in result");
      return NextResponse.json(
        { error: "Invalid email or password. Please check your credentials and try again.", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Create response
    const res = NextResponse.json({ ok: true }, { status: 200 });
    
    // Set the session cookie if tokens are provided
    if (result?.tokens?.token) {
      res.cookies.set("convex-session", result.tokens.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
        sameSite: "lax",
      });
    }

    return res;
  } catch (e: any) {
    console.error("Sign in error:", e);
    // Removed error log for lint
    return NextResponse.json(
      { error: "Auth failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
