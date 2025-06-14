import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

function getToken(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const [t, token] = auth.split(" ");
  if (t !== "Bearer") return null;
  return token;
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  const { conversationId, userId } = await req.json();
  if (!token || !conversationId || !userId)
    return NextResponse.json({ success: false }, { status: 400 });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  await convex.mutation(api.messages.markConversationRead, {
    conversationId,
    userId,
  });
  return NextResponse.json({ success: true });
}
