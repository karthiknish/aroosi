import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  // Only admin can list contact submissions
  const result = await convex.query(api.contact.contactSubmissions, {});
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  // Public endpoint: do not require authentication
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  // Do not set auth for public queries
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Missing or invalid body" },
      { status: 400 }
    );
  }
  const { email, name, subject, message } = body;
  if (
    typeof email !== "string" ||
    typeof name !== "string" ||
    typeof subject !== "string" ||
    typeof message !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid contact fields" },
      { status: 400 }
    );
  }
  try {
    const result = await convex.mutation(api.contact.submitContact, {
      email,
      name,
      subject,
      message,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Failed to submit contact form";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
