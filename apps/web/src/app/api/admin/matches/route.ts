import { createAuthenticatedHandler, successResponse, errorResponse, validateQueryParams } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/api/admin";
import { devLog } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { z } from "zod";

const adminMatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const GET = createAuthenticatedHandler(
  async (ctx) => {
    const startedAt = nowTimestamp();
    const admin = requireAdmin(ctx);
    if (!admin.ok) return admin.response;

    const parsed = validateQueryParams(ctx.request, adminMatchesQuerySchema);
    if (!parsed.success) {
      return errorResponse("Invalid query parameters", 400, {
        correlationId: ctx.correlationId,
        code: "BAD_REQUEST",
        details: { issues: parsed.errors },
      });
    }

    const page = parsed.data.page ?? 1;
    const pageSize = parsed.data.pageSize ?? 20;

    try {
      const matchesSnap = await db.collection("matches").get();
      const rawMatches: Array<Record<string, any>> = matchesSnap.docs.map(
        (d: any) => ({ id: d.id, ...d.data() })
      );

    // Build adjacency: userId -> Set of partnerUserIds
    const adjacency = new Map<string, Set<string>>();
    for (const m of rawMatches) {
      const a = String(m.user1Id || "").trim();
      const b = String(m.user2Id || "").trim();
      if (a && b) {
        if (!adjacency.has(a)) adjacency.set(a, new Set());
        if (!adjacency.has(b)) adjacency.set(b, new Set());
        adjacency.get(a)!.add(b);
        adjacency.get(b)!.add(a);
      }
    }

    const allGrouped = Array.from(adjacency.entries()).map(([uid, partners]) => ({
      profileId: uid,
      partnerIds: Array.from(partners),
    }));

    const total = allGrouped.length;
    const start = (page - 1) * pageSize;
    const paginatedGroups = allGrouped.slice(start, start + pageSize);

    // Fetch partner profiles only for the paginated groups
    const partnerIdsToFetch = new Set<string>();
    paginatedGroups.forEach((g) => {
      g.partnerIds.forEach((id) => partnerIdsToFetch.add(id));
    });

    const idToProfile = new Map<string, any>();
    await Promise.all(
      Array.from(partnerIdsToFetch).map(async (uid) => {
        try {
          const doc = await db.collection("users").doc(uid).get();
          if (doc.exists) {
            const p = doc.data() as any;
            idToProfile.set(uid, {
              _id: uid,
              userId: uid,
              fullName: p?.fullName || p?.displayName || p?.email || "",
              city: p?.city || "",
              occupation: p?.occupation || "",
              dateOfBirth: p?.dateOfBirth || p?.dob || "",
            });
          }
        } catch {}
      })
    );

    const grouped = paginatedGroups.map((g) => ({
      profileId: g.profileId,
      matches: g.partnerIds
        .map((pid) => idToProfile.get(pid))
        .filter(Boolean),
    }));

    devLog("info", "admin.matches", "success", {
      correlationId: ctx.correlationId,
      statusCode: 200,
      durationMs: nowTimestamp() - startedAt,
      groups: grouped.length,
      total,
      edges: rawMatches.length,
    });
    return successResponse(
      {
        matches: grouped,
        total,
        page,
        pageSize,
      },
      200,
      ctx.correlationId
    );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      devLog("error", "admin.matches", "unhandled_error", {
        correlationId: ctx.correlationId,
        statusCode: 500,
        durationMs: nowTimestamp() - startedAt,
        message,
      });
      return errorResponse("Failed to fetch matches", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    rateLimit: { identifier: "admin_matches_list", maxRequests: 200, windowMs: 60 * 60 * 1000 },
  }
);

// DELETE /api/admin/matches - Delete a match
export const DELETE = createAuthenticatedHandler(
  async (ctx, body: { matchId: string }) => {
    const admin = requireAdmin(ctx);
    if (!admin.ok) return admin.response;

    const { matchId } = body || {};
    if (!matchId) {
      return errorResponse("matchId is required", 400, { correlationId: ctx.correlationId });
    }

    try {
      const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();
      
      if (!matchDoc.exists) {
        return errorResponse("Match not found", 404, { correlationId: ctx.correlationId });
      }

      await matchRef.delete();

      devLog("info", "admin.matches", "deleted", {
        correlationId: ctx.correlationId,
        matchId,
      });

      return successResponse({ deleted: true, matchId }, 200, ctx.correlationId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      devLog("error", "admin.matches.delete", "error", {
        correlationId: ctx.correlationId,
        message,
      });
      return errorResponse("Failed to delete match", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "admin_matches_delete", maxRequests: 50, windowMs: 60 * 60 * 1000 },
  }
);
