import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const status = 403;
    devLog("warn", "admin.matches", "auth_failed", {
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Admin privileges required", correlationId },
      { status }
    );
  }
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

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
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      groups: grouped.length,
      total,
      edges: rawMatches.length,
    });
    return NextResponse.json(
      {
        success: true,
        matches: grouped,
        total,
        page,
        pageSize,
        correlationId,
      },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    devLog("error", "admin.matches", "unhandled_error", {
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      message,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches", correlationId },
      { status: 500 }
    );
  }
}
