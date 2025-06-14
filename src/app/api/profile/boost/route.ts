import { NextRequest, NextResponse } from "next/server";
import { api } from "@/../convex/_generated/api";
import { convexClientFromRequest } from "@/lib/convexClient";

export async function POST(request: NextRequest) {
  try {
    const convexClient = await convexClientFromRequest(request);
    const result = await convexClient.mutation(api.users.boostProfile, {});
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("Boost error", error);
    let message = "Boost failed";
    if (isErrorWithMessage(error)) {
      message = error.message;
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}
