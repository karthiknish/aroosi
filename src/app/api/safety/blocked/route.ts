import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { db } from "@/lib/firebaseAdmin";

// NOTE: Explicit JSON helper to avoid accidental 404/redirect behavior from wrappers.
const json = (data: unknown, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Cookie-auth only

export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    // Authentication (cookie-only, app-layer auth)
    const authCheck = await requireSession(request);
    if ("errorResponse" in authCheck) {
      // Normalize helper response to plain JSON
      const res = authCheck.errorResponse as NextResponse;
      let status = res.status || 401;
      let body: any = {
        success: false,
        error: "Authentication failed",
        correlationId,
      };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      // If upstream returned 404 User not found, normalise to 401 (no active session) to avoid noisy 404s
      if (status === 404 && body?.error === "User not found") {
        status = 401;
        body.error = "No auth session";
        body.reason = "user_not_found";
      }
      // Include the parsed upstream auth error body to aid debugging (e.g. missing cookie, invalid token)
      console.warn("Safety blocked auth failed", {
        scope: "safety.blocked",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        authErrorBody: body,
        durationMs: Date.now() - startedAt,
      });
      return json(body, status);
    }
    const { userId } = authCheck;

    // Rate limiting for fetching blocked users
    const rateLimitResult = checkApiRateLimit(
      `safety_blocked_${userId}`,
      50,
      60000
    );
    if (!rateLimitResult.allowed) {
      console.warn("Safety blocked rate limit exceeded", {
        scope: "safety.blocked",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      return json(
        { success: false, error: "Rate limit exceeded", correlationId },
        429
      );
    }

    // Pagination params
    const blockerUserId = userId;
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Math.min(Math.max(limitParam, 1), 50);
    const cursor = searchParams.get("cursor");

    let blockedUsers: any[] = [];
    try {
      let queryRef: FirebaseFirestore.Query = db
        .collection("blocks")
        .where("blockerId", "==", blockerUserId)
        .orderBy("createdAt", "desc")
        .limit(limit);
      if (cursor) {
        try {
          const cursorDoc = await db.collection("blocks").doc(cursor).get();
          if (cursorDoc.exists) queryRef = queryRef.startAfter(cursorDoc);
        } catch {}
      }
      const snap = await queryRef.get();
      blockedUsers = snap.docs.map(
        (d: FirebaseFirestore.QueryDocumentSnapshot) => ({
          id: d.id,
          ...(d.data() as any),
        })
      );

      const uniqueTargetIds = Array.from(
        new Set(blockedUsers.map((b) => b.blockedUserId).filter(Boolean))
      ) as string[];
      if (uniqueTargetIds.length) {
        const profileSnaps = await Promise.all(
          uniqueTargetIds.map((uid) => db.collection("users").doc(uid).get())
        );
        const profileMap = new Map(
          profileSnaps
            .filter((s) => s.exists)
            .map((s) => [s.id, s.data() as any])
        );
        blockedUsers = await Promise.all(
          blockedUsers.map(async (b) => {
            let isBlockedBy = false;
            try {
              const reverse = await db
                .collection("blocks")
                .doc(`${b.blockedUserId}_${blockerUserId}`)
                .get();
              isBlockedBy = reverse.exists;
            } catch {}
            return {
              ...b,
              isBlockedBy,
              blockedProfile: profileMap.has(b.blockedUserId)
                ? {
                    fullName: profileMap.get(b.blockedUserId)?.fullName,
                    profileImageUrl: (profileMap.get(b.blockedUserId)
                      ?.profileImageUrls || [])[0],
                  }
                : undefined,
            };
          })
        );
      }
    } catch (e) {
      console.error("Safety blocked Firestore query error", {
        scope: "safety.blocked",
        type: "firestore_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return json(
        {
          success: false,
          error: "Failed to fetch blocked users",
          correlationId,
        },
        500
      );
    }

    const nextCursor =
      blockedUsers.length === limit
        ? blockedUsers[blockedUsers.length - 1].id
        : null;
    const response = json(
      {
        success: true,
        blockedUsers: blockedUsers || [],
        nextCursor,
        correlationId,
      },
      200
    );
    console.info("Safety blocked success", {
      scope: "safety.blocked",
      type: "success",
      count: blockedUsers.length,
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Safety blocked unhandled error", {
      scope: "safety.blocked",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return json(
      {
        success: false,
        error: "Failed to fetch blocked users",
        details: message,
        correlationId,
      },
      500
    );
  }
}
