import { NextRequest } from "next/server";
import { z } from "zod";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import {
  applySecurityHeaders,
  validateSecurityRequirements,
} from "@/lib/utils/securityHeaders";
import {
  successResponse,
  errorResponse,
  errorResponsePublic,
} from "@/lib/apiResponse";

// Helper: day key like 2025-08-22
function getDayKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// GET: return daily quick picks for the current user
export const GET = withFirebaseAuth(async (user, req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const day = (searchParams.get("day") || getDayKey()).trim();

    // Fetch actions today to avoid repeats
    const actionsSnap = await db
      .collection("quickPicks")
      .where("userId", "==", user.id)
      .where("dayKey", "==", day)
      .get();
    const seen = new Set<string>(
      actionsSnap.docs.map((d: any) => (d.data() as any).toUserId)
    );

    // Fetch candidate users (basic heuristic)
    const usersSnap = await db
      .collection("users")
      .orderBy("updatedAt", "desc")
      .limit(200)
      .get();
    const candidates: any[] = [];
    usersSnap.forEach((doc: any) => {
      if (!doc.exists) return;
      const data = doc.data() as any;
      if (doc.id === user.id) return; // not self
      if (data.banned) return;
      if (data.hiddenFromSearch) return;
      candidates.push({ id: doc.id, ...data });
    });

    const picks = candidates
      .filter((c) => !seen.has(c.id))
      .slice(0, 20)
      .map((c) => ({
        userId: c.id,
        fullName: c.fullName || null,
        city: c.city || null,
        imageUrl:
          Array.isArray(c.profileImageUrls) && c.profileImageUrls[0]
            ? c.profileImageUrls[0]
            : null,
      }));

    const userIds = picks.map((p) => p.userId);
    return applySecurityHeaders(successResponse({ userIds, profiles: picks }));
  } catch (e: any) {
    return applySecurityHeaders(errorResponse(e?.message || "Failed", 500));
  }
});

const actionSchema = z.object({
  toUserId: z.string().min(1),
  action: z.enum(["like", "skip"]),
  day: z.string().optional(),
});

const enrichSchema = z.object({ userIds: z.array(z.string().min(1)).min(1) });

// POST: either act on a quick pick (like/skip) OR enrich userIds -> basic profiles
export const POST = withFirebaseAuth(async (user, req: NextRequest) => {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid)
    return applySecurityHeaders(
      errorResponse(sec.error ?? "Invalid request", 400)
    );

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }

  // Enrichment shape
  const maybeEnrich = enrichSchema.safeParse(body);
  if (maybeEnrich.success) {
    try {
      const ids = maybeEnrich.data.userIds;
      const snaps = await Promise.all(
        ids.map((id) => db.collection("users").doc(id).get())
      );
      const resp = snaps
        .filter((s) => s.exists)
        .map((s) => {
          const d = s.data() as any;
          return {
            userId: s.id,
            fullName: d.fullName || null,
            city: d.city || null,
            imageUrl:
              Array.isArray(d.profileImageUrls) && d.profileImageUrls[0]
                ? d.profileImageUrls[0]
                : null,
          };
        });
      return applySecurityHeaders(successResponse(resp));
    } catch (e: any) {
      return applySecurityHeaders(errorResponse(e?.message || "Failed", 500));
    }
  }

  // Action shape
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(
      errorResponsePublic("Invalid request data", 422)
    );
  }
  const { toUserId, action, day } = parsed.data;
  if (toUserId === user.id)
    return applySecurityHeaders(errorResponsePublic("Invalid target", 400));
  try {
    const dayKey = (day || getDayKey()).trim();
    await db.collection("quickPicks").add({
      userId: user.id,
      toUserId,
      action,
      dayKey,
      createdAt: Date.now(),
    });
    return applySecurityHeaders(successResponse({ success: true }));
  } catch (e: any) {
    const raw = (e?.message || "").toLowerCase();
    let msg = "Couldn't perform action. Please try again.";
    if (raw.includes("permission") || raw.includes("insufficient"))
      msg = "You don't have permission to do that.";
    return applySecurityHeaders(errorResponsePublic(msg, 500));
  }
});

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/firebaseAdmin";
import { FieldPath } from "firebase-admin/firestore";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth"; // TODO: replace with Firebase-only auth implementation
import {
  applySecurityHeaders,
  validateSecurityRequirements,
  checkApiRateLimit,
} from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { buildQuickPick, COL_QUICK_PICKS } from "@/lib/firestoreSchema";
import {
  getCorrelationIdFromHeaders,
  logInfo,
  logWarn,
  logError,
  errorMeta,
} from "@/lib/log";

// Firestore schema notes:
// quickPicks collection stores documents of shape FSQuickPick (see firestoreSchema.ts)
// We generate (ensure) a daily set of picks per user (keyed by dayKey = YYYY-MM-DD).
// For simplicity: store dayKey on each doc (added field) to filter by day.

const DAY_FMT = () => new Date().toISOString().slice(0, 10);

async function ensureQuickPicks(userId: string, dayKey?: string) {
  const day = dayKey || DAY_FMT();
  const col = db.collection(COL_QUICK_PICKS);
  const existingSnap = await col
    .where("userId", "==", userId)
    .where("dayKey", "==", day)
    .orderBy("rank", "asc")
    .get();
  if (!existingSnap.empty) {
    return existingSnap.docs.map(
      (
        d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
      ) => (d.data() as any).candidateUserId as string
    );
  }
  // Basic candidate selection heuristic: pick recent active users not equal to self & not blocked.
  // (Simplified; expand with more advanced scoring later.)
  const usersSnap = await db
    .collection("users")
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();
  const candidates: string[] = [];
  usersSnap.docs.forEach(
    (
      doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    ) => {
      if (doc.id !== userId) candidates.push(doc.id);
    }
  );
  const picks = candidates.slice(0, 10); // limit to 10 for daily quick picks
  const batch = db.batch();
  picks.forEach((candidateUserId, idx) => {
    const pickDoc = col.doc();
    batch.set(pickDoc, {
      ...buildQuickPick(userId, candidateUserId, idx + 1, "basic_v1"),
      dayKey: day,
    });
  });
  await batch.commit();
  return picks;
}

async function fetchQuickPickProfiles(userIds: string[]) {
  if (userIds.length === 0) return [];
  // Firestore does not allow more than 10 in 'in' clause; chunk if needed
  const out: any[] = [];
  const chunkSize = 10;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const slice = userIds.slice(i, i + chunkSize);
    // Use document ID field for lookup instead of a non-existent "_id" field
    const snap = await db
      .collection("users")
      .where(FieldPath.documentId(), "in", slice)
      .get();
    snap.docs.forEach(
      (
        d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
      ) => out.push({ _id: d.id, ...(d.data() as any) })
    );
  }
  return out;
}

export async function GET(req: NextRequest) {
  const correlationId = getCorrelationIdFromHeaders(req.headers);
  const startedAt = Date.now();
  const dayKey = req.nextUrl.searchParams.get("day") || undefined;
  try {
    logInfo("quick_picks.GET.start", { correlationId, dayKey });
    let auth;
    try {
      auth = await requireAuth(req);
    } catch (e) {
      const err = e as AuthError;
      logWarn("quick_picks.GET.auth_failed", {
        correlationId,
        status: err.status,
        code: (err as any)?.code,
        ...errorMeta(err),
      });
      return applySecurityHeaders(errorResponse(err.message, err.status));
    }
    // Rate limit: 30/minute per user
    const rl = checkApiRateLimit(`quick_picks_${auth.userId}`, 30, 60000);
    if (!rl.allowed) {
      logWarn("quick_picks.GET.rate_limited", {
        correlationId,
        userId: auth.userId,
      });
      return applySecurityHeaders(
        errorResponse("Rate limit exceeded", 429, { correlationId })
      );
    }
    const picks = await ensureQuickPicks(auth.userId, dayKey);
    const profiles = await fetchQuickPickProfiles(picks);
    logInfo("quick_picks.GET.success", {
      correlationId,
      userId: auth.userId,
      picksCount: picks.length,
      tookMs: Date.now() - startedAt,
    });
    return applySecurityHeaders(
      successResponse({ userIds: picks, profiles, correlationId })
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logError("quick_picks.GET.error", {
      correlationId,
      msg,
      ...errorMeta(e),
      tookMs: Date.now() - startedAt,
    });
    return applySecurityHeaders(errorResponse(msg, 500, { correlationId }));
  } finally {
    // (Optional logging hook here)
  }
}

const actSchema = z.object({
  toUserId: z.string().min(1),
  action: z.enum(["like", "skip"]),
});

export async function POST(req: NextRequest) {
  const correlationId = getCorrelationIdFromHeaders(req.headers);
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid)
    return applySecurityHeaders(
      errorResponse(sec.error ?? "Invalid request", 400)
    );
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    logWarn("quick_picks.POST.bad_json", { correlationId });
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = actSchema.safeParse(body);
  if (!parsed.success) {
    logWarn("quick_picks.POST.validation_failed", {
      correlationId,
      issues: parsed.error.flatten(),
    });
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        issues: parsed.error.flatten(),
        correlationId,
      })
    );
  }
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (e) {
    const err = e as AuthError;
    logWarn("quick_picks.POST.auth_failed", {
      correlationId,
      status: err.status,
      code: (err as any)?.code,
      ...errorMeta(err),
    });
    return applySecurityHeaders(errorResponse(err.message, err.status));
  }
  const { toUserId, action } = parsed.data;
  if (toUserId === auth.userId)
    return applySecurityHeaders(errorResponse("Cannot act on self", 400));
  try {
    // Record action: like -> create interest document; skip -> mark skipped entry to avoid resurfacing.
    if (action === "like") {
      // Create interest (idempotent)
      const interestsCol = db.collection("interests");
      const existing = await interestsCol
        .where("fromUserId", "==", auth.userId)
        .where("toUserId", "==", toUserId)
        .limit(1)
        .get();
      if (existing.empty) {
        await interestsCol.add({
          fromUserId: auth.userId,
          toUserId,
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } else {
      // skip -> write a skip marker so ensureQuickPicks can exclude next generation (future enhancement)
      await db
        .collection("quickPickSkips")
        .add({ userId: auth.userId, toUserId, createdAt: Date.now() });
    }
    logInfo("quick_picks.POST.success", {
      correlationId,
      userId: auth.userId,
      action,
      toUserId,
    });
    return applySecurityHeaders(
      successResponse({ success: true, action, toUserId, correlationId })
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logError("quick_picks.POST.error", { correlationId, msg, ...errorMeta(e) });
    return applySecurityHeaders(errorResponse(msg, 500, { correlationId }));
  }
}
