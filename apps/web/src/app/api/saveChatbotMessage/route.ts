import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { successResponse, errorResponse } from "@/lib/api/handler";

export async function POST(req: NextRequest) {
  try {
    const { email, role, text, timestamp } = await req.json();

    if (!email || !role || !text || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

  await db
    .collection("chatbotMessages")
    .add({ email, role, text, timestamp, createdAt: Date.now() });
  return successResponse({ success: true });
  } catch (error: unknown) {
  return errorResponse("Failed to save message", 500, {
    details: { message: error instanceof Error ? error.message : String(error) },
  });
  }
}
