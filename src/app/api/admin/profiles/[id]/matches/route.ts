import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

function getToken(req: NextRequest): { token: string | null; error?: string } {
  const auth = req.headers.get("authorization");
  if (!auth) return { token: null, error: "No auth header" };
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token)
    return { token: null, error: "Invalid token" };
  return { token };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { token, error } = getToken(req);
  if (!token)
    return NextResponse.json({ success: false, error }, { status: 401 });
  if (!process.env.NEXT_PUBLIC_CONVEX_URL)
    return NextResponse.json(
      { success: false, error: "Server config" },
      { status: 500 }
    );

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  try {
    // @ts-expect-error – Convex Id typing mismatch handled server-side
    const matches = await convex.query(api.users.getMatchesForProfile, {
      profileId: params.id,
    });
    return NextResponse.json({ success: true, matches }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
