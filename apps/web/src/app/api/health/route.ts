import { NextResponse } from "next/server";
import { nowTimestamp } from "@/lib/utils/timestamp";

export async function GET() {
  return NextResponse.json({ 
    message: "Service is healthy",
    timestamp: nowTimestamp()
  });
}