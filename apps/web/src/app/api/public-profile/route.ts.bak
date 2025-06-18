import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Missing userId" },
      { status: 400 }
    );
  }
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { success: false, error: "Server" },
      { status: 500 }
    );
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  try {
    const res = await convex.query(api.users.getUserPublicProfile, {
      userId: userId as Id<"users">,
    });
    if (!res || !res.profile) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: { ...res.profile, userId },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed",
        details:
          process.env.NODE_ENV === "development"
            ? e instanceof Error
              ? e.message
              : String(e)
            : undefined,
      },
      { status: 500 }
    );
  }
}
