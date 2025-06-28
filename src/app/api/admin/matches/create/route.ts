import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { requireAdminToken } from "@/app/api/_utils/auth";
import { Notifications } from "@/lib/notify";
import type { Doc, Id } from "@convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  const adminCheck = requireAdminToken(req);
  if ("errorResponse" in adminCheck) {
    return adminCheck.errorResponse;
  }
  const { token } = adminCheck;
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
    const fromProfile = (await convex.query(api.users.getProfileById, {
      id: fromProfileId as Id<"profiles">,
    })) as Doc<"profiles"> | null;
    const toProfile = (await convex.query(api.users.getProfileById, {
      id: toProfileId as Id<"profiles">,
    })) as Doc<"profiles"> | null;
    if (!fromProfile || !toProfile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const fromUserId = fromProfile.userId;
    const toUserId = toProfile.userId;

    const upsertAcceptedInterest = async (
      fromUser: Id<"users">,
      toUser: Id<"users">
    ) => {
      // check existing interest
      const existing = (await convex.query(api.interests.getSentInterests, {
        userId: fromUser,
      })) as Doc<"interests">[];
      const found = existing.find((i) => i.toUserId === toUser);
      if (found) {
        if (found.status !== "accepted") {
          await convex.mutation(api.interests.respondToInterest, {
            interestId: found._id,
            status: "accepted",
          });
        }
        return found._id;
      }
      const result = await convex.mutation(api.interests.sendInterest, {
        fromUserId: fromUser,
        toUserId: toUser,
      });
      if (!result.success) {
        throw new Error(result.error || "Failed to send interest");
      }
      const newId = result.interestId as Id<"interests">;
      await convex.mutation(api.interests.respondToInterest, {
        interestId: newId,
        status: "accepted",
      });
      return newId;
    };

    await upsertAcceptedInterest(fromUserId, toUserId);
    await upsertAcceptedInterest(toUserId, fromUserId);

    // send match emails, non-blocking
    (async () => {
      try {
        if (fromProfile.email && toProfile.email) {
          await Promise.all([
            Notifications.newMatch(
              fromProfile.email,
              fromProfile.fullName || "",
              toProfile.fullName || "A user"
            ),
            Notifications.newMatch(
              toProfile.email,
              toProfile.fullName || "",
              fromProfile.fullName || "A user"
            ),
          ]);
        }
      } catch (e) {
        console.error("match email send error", e);
      }
    })();

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
