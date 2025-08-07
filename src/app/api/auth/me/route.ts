import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if ("errorResponse" in session) return session.errorResponse as NextResponse;

  const { user, profile } = session;
  return NextResponse.json({
    user: {
      id: String(user._id || user.id || ""),
      email: String(user.email || ""),
      role: String(user.role || "user"),
      profile: profile
        ? {
            id: String(profile._id || ""),
            isProfileComplete: !!profile.isProfileComplete,
            isOnboardingComplete: !!profile.isOnboardingComplete,
          }
        : null,
    },
  });
}
