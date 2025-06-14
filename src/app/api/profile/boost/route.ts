import { NextRequest, NextResponse } from "next/server";
import { api } from "@/../convex/_generated/api";
import { convexClientFromRequest } from "@/lib/convexClient";

export async function POST(request: NextRequest) {
  try {
    const convexClient = await convexClientFromRequest(request);
    const result = await convexClient.mutation(api.users.boostProfile, {});
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Boost error", error);
    return NextResponse.json(
      { success: false, error: error.message || "Boost failed" },
      { status: 400 }
    );
  }
}
