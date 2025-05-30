import { NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || undefined;
  const religion = searchParams.get("religion") || undefined;
  const ageMin = searchParams.get("ageMin")
    ? Number(searchParams.get("ageMin"))
    : undefined;
  const ageMax = searchParams.get("ageMax")
    ? Number(searchParams.get("ageMax"))
    : undefined;
  const preferredGender = searchParams.get("preferredGender") || undefined;
  const result = await convex.action(api.users.searchPublicProfiles, {
    city,
    religion,
    ageMin,
    ageMax,
    preferredGender,
  });
  return NextResponse.json(result);
}
