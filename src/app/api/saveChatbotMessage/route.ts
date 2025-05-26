import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { email, role, text, timestamp } = await req.json();

    if (!email || !role || !text || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
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
      { status: 500 }
    );
  }
}
