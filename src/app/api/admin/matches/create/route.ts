import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { Notifications } from "@/lib/notify";
import type { Doc, Id } from "@convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const res = adminCheck.errorResponse as NextResponse;
    const status = res.status || 401;
    let body: unknown = { error: "Unauthorized", correlationId };
    try {
      const txt = await res.text();
      body = txt ? { ...JSON.parse(txt), correlationId } : body;
    } catch {}
    console.warn("Admin matches.create POST auth failed", {
      scope: "admin.matches_create",
      type: "auth_failed",
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(body, { status });
  }

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    console.error("Admin matches.create POST convex url missing", {
      scope: "admin.matches_create",
      type: "convex_not_configured",
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Server config error", correlationId },
      { status: 500 }
    );
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

  const convex = getConvexClient();
  if (!convex) {
    console.error("Admin matches.create POST convex not configured", {
      scope: "admin.matches_create",
      type: "convex_not_configured",
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Convex client not configured", correlationId },
      { status: 500 }
    );
  }

  try {
    const fromProfile = (await convex
      .query(api.users.getProfileById, {
        id: fromProfileId as Id<"profiles">,
      })
      .catch((e: unknown) => {
        console.error("Admin matches.create POST getProfileById(from) error", {
          scope: "admin.matches_create",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      })) as Doc<"profiles"> | null;

    const toProfile = (await convex
      .query(api.users.getProfileById, {
        id: toProfileId as Id<"profiles">,
      })
      .catch((e: unknown) => {
        console.error("Admin matches.create POST getProfileById(to) error", {
          scope: "admin.matches_create",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      })) as Doc<"profiles"> | null;

    if (!fromProfile || !toProfile) {
      return NextResponse.json(
        { error: "Profile not found", correlationId },
        { status: 404 }
      );
    }

    const fromUserId = fromProfile.userId;
    const toUserId = toProfile.userId;

    const upsertAcceptedInterest = async (
      fromUser: Id<"users">,
      toUser: Id<"users">
    ) => {
      const existing = (await convex
        .query(api.interests.getSentInterests, {
          userId: fromUser,
        })
        .catch((e: unknown) => {
          console.error("Admin matches.create POST getSentInterests error", {
            scope: "admin.matches_create",
            type: "convex_query_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return [] as Doc<"interests">[];
        })) as Doc<"interests">[];

      const found = existing.find((i) => i.toUserId === toUser);
      if (found) {
        if (found.status !== "accepted") {
          await convex
            .mutation(api.interests.respondToInterest, {
              interestId: found._id,
              status: "accepted",
            })
            .catch((e: unknown) => {
              console.error(
                "Admin matches.create POST respondToInterest update error",
                {
                  scope: "admin.matches_create",
                  type: "convex_mutation_error",
                  message: e instanceof Error ? e.message : String(e),
                  correlationId,
                  statusCode: 500,
                  durationMs: Date.now() - startedAt,
                }
              );
            });
        }
        return found._id;
      }
      const result = await convex
        .mutation(api.interests.sendInterest, {
          fromUserId: fromUser,
          toUserId: toUser,
        })
        .catch((e: unknown) => {
          console.error("Admin matches.create POST sendInterest error", {
            scope: "admin.matches_create",
            type: "convex_mutation_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          return { success: false, error: "Failed to send interest" } as {
            success: false;
            error?: string;
            interestId?: Id<"interests">;
          };
        });

      if (!result || (result as { success?: boolean }).success !== true) {
        throw new Error(
          (result as { error?: string })?.error || "Failed to send interest"
        );
      }
      const newId = (result as { interestId?: Id<"interests"> }).interestId as Id<"interests">;
      await convex
        .mutation(api.interests.respondToInterest, {
          interestId: newId,
          status: "accepted",
        })
        .catch((e: unknown) => {
          console.error("Admin matches.create POST respondToInterest create error", {
            scope: "admin.matches_create",
            type: "convex_mutation_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
        });
      return newId;
    };

    await upsertAcceptedInterest(fromUserId, toUserId);
    await upsertAcceptedInterest(toUserId, fromUserId);

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
          process.env.NODE_ENV === "development" ? message : "Failed to create match",
        correlationId,
      },
      { status: 500 }
    );
  }
}
