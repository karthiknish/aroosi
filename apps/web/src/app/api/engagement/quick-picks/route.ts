// (Removed duplicated minimal implementation in favor of consolidated version below)

import { NextRequest } from "next/server";
import { z } from "zod";
import { db, adminStorage } from "@/lib/firebaseAdmin";
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

  // Get user's profile to determine gender preference
  let preferredGender: string | null = null;
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data() as any;
      preferredGender = userData?.preferredGender || null;
    }
  } catch { }

  // Get users this person has already interacted with (liked or skipped)
  const interactedIds = new Set<string>();
  try {
    const [likedSnap, skippedSnap] = await Promise.all([
      db.collection("interests")
        .where("fromUserId", "==", userId)
        .select("toUserId")
        .get(),
      db.collection("quickPickSkips")
        .where("userId", "==", userId)
        .select("toUserId")
        .get(),
    ]);
    likedSnap.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => interactedIds.add((d.data() as any).toUserId));
    skippedSnap.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => interactedIds.add((d.data() as any).toUserId));
  } catch { }

  // Build query for candidates - filter by gender if preference set
  let query = db.collection("users").orderBy("updatedAt", "desc").limit(200);
  if (preferredGender && preferredGender !== "any") {
    query = db.collection("users")
      .where("gender", "==", preferredGender)
      .orderBy("updatedAt", "desc")
      .limit(200);
  }

  const usersSnap = await query.get();
  const candidates: string[] = [];
  usersSnap.docs.forEach(
    (
      doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    ) => {
      const data = doc.data() as any;
      // Exclude self, banned, hidden, and already interacted
      if (
        doc.id !== userId &&
        data.banned !== true &&
        data.hiddenFromSearch !== true &&
        !interactedIds.has(doc.id)
      ) {
        candidates.push(doc.id);
      }
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

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;

  // Helper to get signed URL for a storage path or raw URL
  const getAccessibleImageUrl = async (urlOrPath: string): Promise<string> => {
    if (!urlOrPath) return "";

    // If it's already a signed URL, return as-is
    if (urlOrPath.includes("X-Goog-Signature")) return urlOrPath;

    // If it's a relative API path, return as-is
    if (urlOrPath.startsWith("/api/")) return urlOrPath;

    // If it's a direct GCS URL, sign it
    if (urlOrPath.includes("storage.googleapis.com")) {
      const match = urlOrPath.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
      if (match && match[1]) {
        try {
          const file = adminStorage.bucket(bucketName).file(decodeURIComponent(match[1]));
          const [signedUrl] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + 60 * 60 * 1000,
          });
          return signedUrl;
        } catch {
          return urlOrPath;
        }
      }
    }

    // If it looks like a storage path, sign it
    if (urlOrPath.startsWith("users/")) {
      try {
        const file = adminStorage.bucket(bucketName).file(urlOrPath);
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 60 * 60 * 1000,
        });
        return signedUrl;
      } catch {
        return `https://storage.googleapis.com/${bucketName}/${urlOrPath}`;
      }
    }

    return urlOrPath;
  };

  // Firestore does not allow more than 10 in 'in' clause; chunk if needed
  const out: any[] = [];
  const chunkSize = 10;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const slice = userIds.slice(i, i + chunkSize);
    const snap = await db
      .collection("users")
      .where(FieldPath.documentId(), "in", slice)
      .get();

    await Promise.all(
      snap.docs.map(async (d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => {
        const data = d.data() as any;
        const profileImageUrls = Array.isArray(data.profileImageUrls) ? data.profileImageUrls : [];

        // Sign the first image URL if present
        const signedUrls = await Promise.all(
          profileImageUrls.slice(0, 3).map((url: string) => getAccessibleImageUrl(url))
        );

        out.push({
          _id: d.id,
          userId: d.id,
          fullName: data.fullName || null,
          city: data.city || null,
          profileImageUrls: signedUrls,
        });
      })
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
    // Deny banned users explicitly (defense-in-depth; middleware also gates)
    try {
      const u = await db.collection("users").doc(auth.userId).get();
      if (u.exists && (u.data() as any)?.banned === true) {
        return applySecurityHeaders(errorResponse("Account is banned", 403));
      }
    } catch { }
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
