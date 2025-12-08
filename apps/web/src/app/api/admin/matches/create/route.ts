import { NextRequest, NextResponse } from "next/server";
import { Notifications } from "@/lib/notify";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const status = 403;
    const body = { error: "Unauthorized", correlationId };
    console.warn("Admin matches.create POST auth failed", {
      scope: "admin.matches_create",
      type: "auth_failed",
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(body, { status });
  }

  let body: { fromProfileId?: string; toProfileId?: string };
  try {
    body = await req.json();
  } catch {
    console.warn("Admin matches.create POST invalid JSON", {
      scope: "admin.matches_create",
      type: "validation_error",
      correlationId,
      statusCode: 400,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Invalid JSON", correlationId },
      { status: 400 }
    );
  }
  const { fromProfileId, toProfileId } = body;
  if (!fromProfileId || !toProfileId || fromProfileId === toProfileId) {
    console.warn("Admin matches.create POST invalid profile ids", {
      scope: "admin.matches_create",
      type: "validation_error",
      correlationId,
      statusCode: 400,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Invalid profile IDs", correlationId },
      { status: 400 }
    );
  }

  try {
    const fromProfileDoc = await db
      .collection("users")
      .doc(fromProfileId)
      .get();
    const toProfileDoc = await db.collection("users").doc(toProfileId).get();
    if (!fromProfileDoc.exists || !toProfileDoc.exists) {
      return NextResponse.json(
        { error: "Profile not found", correlationId },
        { status: 404 }
      );
    }
    const fromProfile: any = fromProfileDoc.data();
    const toProfile: any = toProfileDoc.data();
    const fromUserId = fromProfile.id || fromProfileDoc.id;
    const toUserId = toProfile.id || toProfileDoc.id;

    // Helper to upsert an accepted interest
    const upsertAcceptedInterest = async (fromUser: string, toUser: string) => {
      const existingSnap = await db
        .collection("interests")
        .where("fromUserId", "==", fromUser)
        .where("toUserId", "==", toUser)
        .limit(1)
        .get();
      if (!existingSnap.empty) {
        const docRef = existingSnap.docs[0].ref;
        const data = existingSnap.docs[0].data();
        if (data.status !== "accepted")
          await docRef.update({ status: "accepted" });
        return docRef.id;
      }
      const docRef = await db.collection("interests").add({
        fromUserId: fromUser,
        toUserId: toUser,
        status: "accepted",
        createdAt: Date.now(),
      });
      return docRef.id;
    };

    await upsertAcceptedInterest(fromUserId, toUserId);
    await upsertAcceptedInterest(toUserId, fromUserId);

    // Create match if not exists
    const m1 = await db
      .collection("matches")
      .where("user1Id", "==", fromUserId)
      .where("user2Id", "==", toUserId)
      .limit(1)
      .get();
    const m2 = await db
      .collection("matches")
      .where("user1Id", "==", toUserId)
      .where("user2Id", "==", fromUserId)
      .limit(1)
      .get();
    if (m1.empty && m2.empty) {
      const conversationId = [fromUserId, toUserId].sort().join("_");
      await db.collection("matches").add({
        user1Id: fromUserId,
        user2Id: toUserId,
        status: "matched",
        createdAt: Date.now(),
        conversationId,
      });
    }

    void (async () => {
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
        console.error("Admin matches.create POST match email send error", {
          scope: "admin.matches_create",
          type: "unhandled_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
        });
      }
    })();

    console.info("Admin matches.create POST success", {
      scope: "admin.matches_create",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      fromProfileId,
      toProfileId,
    });
    return NextResponse.json({ success: true, correlationId }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Admin matches.create POST unhandled error", {
      scope: "admin.matches_create",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "Failed to create match",
        correlationId,
      },
      { status: 500 }
    );
  }
}
