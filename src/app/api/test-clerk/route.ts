import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Clerk migration in progress" });
}