import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export async function GET() {
  const { userId, getToken, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Robust admin check
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;
  if (role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Admins only" },
      { status: 403 }
    );
  }
  const token = await getToken({ template: "convex" });
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
  const requiredFields = ["name", "email", "subject", "message"];
  for (const field of requiredFields) {
    if (!body[field] || typeof body[field] !== "string") {
      return NextResponse.json(
        { error: `Missing or invalid field: ${field}` },
        { status: 400 }
      );
    }
  }
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const result = await convex.mutation(api.contact.submitContact, {
      name: body.name as string,
      email: body.email as string,
      subject: body.subject as string,
      message: body.message as string,
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
