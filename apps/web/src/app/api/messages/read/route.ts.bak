import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function POST(req: NextRequest) {
  const authCheck = requireUserToken(req);
  if ("errorResponse" in authCheck) return authCheck.errorResponse;
  const { token } = authCheck;
  const { conversationId, userId } = await req.json();
  if (!conversationId || !userId)
    return NextResponse.json({ success: false }, { status: 400 });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  await convex.mutation(api.messages.markConversationRead, {
    conversationId,
    userId,
  });
  return NextResponse.json({ success: true });
}
