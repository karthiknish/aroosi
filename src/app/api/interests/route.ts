import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);
    const result = await convex.query(api.interests.listAllInterests, {});
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/interests error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);
    const body = await req.json();
    const { fromUserId, toUserId } = body;
    if (
      !fromUserId ||
      !toUserId ||
      typeof fromUserId !== "string" ||
      typeof toUserId !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid or missing user IDs" },
        { status: 400 }
      );
    }
    try {
      const result = await convex.mutation(api.interests.sendInterest, {
        fromUserId: fromUserId as Id<"users">,
        toUserId: toUserId as Id<"users">,
      });
      return NextResponse.json(result);
    } catch (convexErr) {
      console.error("Convex sendInterest error:", convexErr);
      return NextResponse.json(
        { error: (convexErr as Error).message || "Failed to send interest" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("POST /api/interests error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);
    const body = await req.json();
    const { fromUserId, toUserId } = body;
    if (
      !fromUserId ||
      !toUserId ||
      typeof fromUserId !== "string" ||
      typeof toUserId !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid or missing user IDs" },
        { status: 400 }
      );
    }
    try {
      const result = await convex.mutation(api.interests.removeInterest, {
        fromUserId: fromUserId as Id<"users">,
        toUserId: toUserId as Id<"users">,
      });
      return NextResponse.json(result);
    } catch (convexErr) {
      console.error("Convex removeInterest error:", convexErr);
      return NextResponse.json(
        { error: (convexErr as Error).message || "Failed to remove interest" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("DELETE /api/interests error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


