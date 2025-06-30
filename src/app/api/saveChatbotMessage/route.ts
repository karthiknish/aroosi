import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const convex = getConvexClient();
    if (!convex) {
      return NextResponse.json(
        { error: "Convex client not configured" },
        { status: 500 },
      );
    }

    const { email, role, text, timestamp } = await req.json();

    if (!email || !role || !text || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await convex.mutation(api.messages.saveChatbotMessage, {
      email,
      role,
      text,
      timestamp,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error saving chatbot message:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save message",
      },
      { status: 500 },
    );
  }
}
