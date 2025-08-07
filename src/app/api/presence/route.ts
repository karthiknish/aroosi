import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { api } from "@convex/_generated/api";
import { fetchMutation, fetchQuery } from "convex/nextjs";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;
    await fetchMutation(api.presence.heartbeat, { userId });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: "presence update failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    const result = await fetchQuery(api.presence.getPresence, { userId } as any);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    return NextResponse.json({ success: false, error: "presence query failed" }, { status: 500 });
  }
}


