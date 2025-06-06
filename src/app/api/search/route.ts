import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type Gender = "any" | "male" | "female" | "other";

export async function GET(request: Request) {
  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("No Bearer token provided in request");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error("Invalid token format");
      return NextResponse.json({ error: "Invalid token format" }, { status: 401 });
    }

    console.log("Setting auth token for Convex");
    convexClient.setAuth(token);

    const { searchParams } = new URL(request.url);
    const ukCity = searchParams.get("city") || undefined;
    const ageMin = searchParams.get("ageMin")
      ? parseInt(searchParams.get("ageMin")!)
      : undefined;
    const ageMax = searchParams.get("ageMax")
      ? parseInt(searchParams.get("ageMax")!)
      : undefined;
    const preferredGender = (searchParams.get("preferredGender") ||
      undefined) as Gender | undefined;
    const page = parseInt(searchParams.get("page") || "0");
    const pageSize = parseInt(searchParams.get("pageSize") || "12");

    console.log("Searching profiles with params:", {
      ukCity,
      ageMin,
      ageMax,
      preferredGender,
      page,
      pageSize,
    });

    const result = await convexClient.query(api.users.searchPublicProfiles, {
      ukCity,
      ageMin,
      ageMax,
      preferredGender,
      page,
      pageSize,
    });

    console.log("Search results:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in search API route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
