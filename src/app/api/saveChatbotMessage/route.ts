import { NextRequest, NextResponse } from "next/server";
import { convexMutationWithAuth } from "@/lib/convexServer";
import { api } from "@convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const { email, role, text, timestamp } = await req.json();

    if (!email || !role || !text || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await convexMutationWithAuth(req, api.messages.saveChatbotMessage, {
      email,
      role,
      text,
      timestamp,
    } as any);

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
