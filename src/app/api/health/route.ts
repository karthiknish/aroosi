import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "Service is healthy",
    timestamp: new Date().toISOString()
  });
}