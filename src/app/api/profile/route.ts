import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export async function GET() {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const result = await convex.query(api.users.getCurrentUserWithProfile, {});
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
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
  // Optionally, validate allowed fields (add more as needed)
  const allowedFields = [
    "fullName",
    "dateOfBirth",
    "gender",
    "ukCity",
    "ukPostcode",
    "religion",
    "caste",
    "motherTongue",
    "height",
    "maritalStatus",
    "education",
    "occupation",
    "annualIncome",
    "aboutMe",
    "partnerPreferenceAgeMin",
    "partnerPreferenceAgeMax",
    "partnerPreferenceReligion",
    "partnerPreferenceUkCity",
    "profileImageIds",
    "phoneNumber",
    "diet",
    "smoking",
    "drinking",
    "physicalStatus",
    "preferredGender",
  ];
  for (const key of Object.keys(body)) {
    if (!allowedFields.includes(key)) {
      return NextResponse.json(
        { error: `Invalid field: ${key}` },
        { status: 400 }
      );
    }
  }
  try {
    const result = await convex.mutation(api.users.updateProfile, body);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
