import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/apiAuth";

// Example of a protected API route
export const GET = requireAuth(async (request: NextRequest, user) => {
  return NextResponse.json({
    message: "This is a protected route",
    user: {
      id: user.userId,
      email: user.email,
      role: user.role,
    },
  });
});

// Example of a protected POST route
export const POST = requireAuth(async (request: NextRequest, user) => {
  const body = await request.json();

  return NextResponse.json({
    message: "Data received successfully",
    data: body,
    user: {
      id: user.userId,
      email: user.email,
      role: user.role,
    },
  });
});
