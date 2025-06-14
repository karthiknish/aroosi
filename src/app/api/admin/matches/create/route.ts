/* eslint-disable @typescript-eslint/no-explicit-any */
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

export async function POST(req: NextRequest) {
  const { token, error } = getToken(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: error || "Unauthorized" },
      { status: 401 }
    );
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { success: false, error: "Server config error" },
      { status: 500 }
    );
  }

  let body: { fromProfileId?: string; toProfileId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }
  const { fromProfileId, toProfileId } = body;
  if (!fromProfileId || !toProfileId || fromProfileId === toProfileId) {
    return NextResponse.json(
      { success: false, error: "Invalid profile IDs" },
      { status: 400 }
    );
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);

  try {
    // Fetch profiles to get underlying userIds
    const fromProfile: any = await convex.query(api.users.getProfileById, {
      id: fromProfileId as any,
    });
    const toProfile: any = await convex.query(api.users.getProfileById, {
      id: toProfileId as any,
    });
    if (!fromProfile || !toProfile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const fromUserId = fromProfile.userId;
    const toUserId = toProfile.userId;

    async function upsertAcceptedInterest(fromUser: string, toUser: string) {
      // check existing interest
      const existing: any = await convex.query(api.interests.getSentInterests, {
        userId: fromUser as any,
      });
      const found = existing.find((i: any) => i.toUserId === toUser);
      if (found) {
        if (found.status !== "accepted") {
          await convex.mutation(api.interests.respondToInterest, {
            interestId: found._id,
            status: "accepted",
          });
        }
        return found._id;
      }
      const newId: any = await convex.mutation(api.interests.sendInterest, {
        fromUserId: fromUser as any,
        toUserId: toUser as any,
      });
      await convex.mutation(api.interests.respondToInterest, {
        interestId: newId,
        status: "accepted",
      });
      return newId;
    }

    await upsertAcceptedInterest(fromUserId, toUserId);
    await upsertAcceptedInterest(toUserId, fromUserId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development"
            ? err instanceof Error
              ? err.message
              : String(err)
            : "Failed to create match",
      },
      { status: 500 }
    );
  }
}
