import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
} from "@/lib/api/handler";
import type { ApiContext } from "@/lib/api/handler";
import { db, getAccessibleStorageUrl } from "@/lib/firebaseAdmin";
import { FieldPath } from "firebase-admin/firestore";
import { buildQuickPick, COL_QUICK_PICKS } from "@/lib/firestoreSchema";
import { engagementQuickPickActionSchema } from "@/lib/validation/apiSchemas/engagement";
import { nowTimestamp } from "@/lib/utils/timestamp";
import {
  buildInterest,
  buildMatch,
  COL_INTERESTS,
  COL_MATCHES,
  deterministicMatchId,
  interestId,
} from "@/lib/firestoreSchema";
import type { FSInterest } from "@/lib/firestoreSchema";

const DAY_FMT = () => new Date(nowTimestamp()).toISOString().slice(0, 10);

type QuickPickUser = {
  id?: string;
  fullName?: string | null;
  city?: string | null;
  profileImageUrls?: string[];
  preferredGender?: string | null;
  banned?: boolean;
  hiddenFromSearch?: boolean;
};

type QuickPickProfile = {
  _id: string;
  userId: string;
  fullName: string | null;
  city: string | null;
  profileImageUrls: string[];
};

function snapshotUser(user: QuickPickUser | null | undefined) {
  if (!user) return undefined;
  const snap: Record<string, string> = {};
  if (user.fullName != null) snap.fullName = user.fullName;
  if (user.city != null) snap.city = user.city;
  const firstImage = Array.isArray(user.profileImageUrls)
    ? user.profileImageUrls[0]
    : undefined;
  if (firstImage) snap.image = firstImage;
  return Object.keys(snap).length ? snap : undefined;
}

async function loadUser(userId: string) {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as QuickPickUser) };
}

async function ensureMatchIfMutual(fromUserId: string, toUserId: string) {
  const matchDocId = deterministicMatchId(fromUserId, toUserId);
  const existingDoc = await db.collection(COL_MATCHES).doc(matchDocId).get();
  if (existingDoc.exists) return;
  const match = buildMatch(fromUserId, toUserId);
  await db.collection(COL_MATCHES).doc(matchDocId).set(match, { merge: true });
}

async function isBlocked(a: string, b: string) {
  const blockId1 = `${a}_${b}`;
  const blockId2 = `${b}_${a}`;
  const snap1 = await db.collection("blocks").doc(blockId1).get();
  if (snap1.exists) return true;
  const snap2 = await db.collection("blocks").doc(blockId2).get();
  return snap2.exists;
}

async function ensureQuickPicks(userId: string, dayKey?: string) {
  const day = dayKey || DAY_FMT();
  const col = db.collection(COL_QUICK_PICKS);
  const existingSnap = await col
    .where("userId", "==", userId)
    .where("dayKey", "==", day)
    .orderBy("rank", "asc")
    .get();
  
  if (!existingSnap.empty) {
    return existingSnap.docs
      .map(
        (
          doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
        ) => (doc.data() as { candidateUserId?: string }).candidateUserId
      )
      .filter(
        (candidateUserId: string | undefined): candidateUserId is string =>
          typeof candidateUserId === "string" && candidateUserId.length > 0
      );
  }

  let preferredGender: string | null = null;
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data() as QuickPickUser;
      preferredGender = userData?.preferredGender || null;
    }
  } catch {}

  const interactedIds = new Set<string>();
  try {
    const [likedSnap, skippedSnap] = await Promise.all([
      db.collection("interests").where("fromUserId", "==", userId).select("toUserId").get(),
      db.collection("quickPickSkips").where("userId", "==", userId).select("toUserId").get(),
    ]);
    likedSnap.docs.forEach(
      (doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => {
      const toUserId = (doc.data() as { toUserId?: string }).toUserId;
      if (toUserId) interactedIds.add(toUserId);
      }
    );
    skippedSnap.docs.forEach(
      (doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => {
      const toUserId = (doc.data() as { toUserId?: string }).toUserId;
      if (toUserId) interactedIds.add(toUserId);
      }
    );
  } catch {}

  let usersSnap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
  try {
    if (preferredGender && preferredGender !== "any") {
      usersSnap = await db.collection("users").where("gender", "==", preferredGender).orderBy("updatedAt", "desc").limit(200).get();
    } else {
      usersSnap = await db.collection("users").orderBy("updatedAt", "desc").limit(200).get();
    }
  } catch {
    usersSnap = await db.collection("users").orderBy("updatedAt", "desc").limit(200).get();
  }

  const candidates: string[] = [];
  usersSnap.docs.forEach((doc) => {
    const data = doc.data() as QuickPickUser;
    if (doc.id !== userId && data.banned !== true && data.hiddenFromSearch !== true && !interactedIds.has(doc.id)) {
      candidates.push(doc.id);
    }
  });

  const picks = candidates.slice(0, 10);
  const batch = db.batch();
  picks.forEach((candidateUserId, idx) => {
    const pickDoc = col.doc();
    batch.set(pickDoc, { ...buildQuickPick(userId, candidateUserId, idx + 1, "basic_v1"), dayKey: day });
  });
  await batch.commit();
  return picks;
}

async function fetchQuickPickProfiles(userIds: string[]) {
  if (userIds.length === 0) return [];

  const out: QuickPickProfile[] = [];
  const chunkSize = 10;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const slice = userIds.slice(i, i + chunkSize);
    const snap = await db.collection("users").where(FieldPath.documentId(), "in", slice).get();

    await Promise.all(
      snap.docs.map(async (doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => {
        const data = doc.data() as QuickPickUser;
        const profileImageUrls = Array.isArray(data.profileImageUrls) ? data.profileImageUrls : [];
        const signedUrls = await Promise.all(profileImageUrls.slice(0, 3).map((url: string) => getAccessibleStorageUrl(url)));

        out.push({
          _id: doc.id,
          userId: doc.id,
          fullName: data.fullName || null,
          city: data.city || null,
          profileImageUrls: signedUrls,
        });
      })
    );
  }
  return out;
}

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const authUser = ctx.user as { userId?: string; id?: string };
    const userId = authUser.userId || authUser.id;
    const { searchParams } = new URL(ctx.request.url);
    const dayKey = searchParams.get("day") || undefined;

    if (!userId) {
      return errorResponse("Unauthorized", 401, { correlationId: ctx.correlationId });
    }

    try {
      // Deny banned users
      const u = await db.collection("users").doc(userId).get();
      const userData = u.exists ? (u.data() as QuickPickUser) : undefined;
      if (userData?.banned === true) {
        return errorResponse("Account is banned", 403, { correlationId: ctx.correlationId });
      }

      const picks = await ensureQuickPicks(userId, dayKey);
      const profiles = await fetchQuickPickProfiles(picks);

      return successResponse({ userIds: picks, profiles }, 200, ctx.correlationId);
    } catch (e) {
      console.error("engagement/quick-picks GET error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch quick picks", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "quick_picks_get", maxRequests: 30 }
  }
);

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof engagementQuickPickActionSchema>
  ) => {
    const authUser = ctx.user as { userId?: string; id?: string };
    const userId = authUser.userId || authUser.id;
    const { toUserId, action } = body;

    if (!userId) {
      return errorResponse("Unauthorized", 401, { correlationId: ctx.correlationId });
    }

    if (toUserId === userId) {
      return errorResponse("Cannot act on self", 400, { correlationId: ctx.correlationId });
    }

    try {
      if (action === "like") {
        if (await isBlocked(userId, toUserId)) {
          return errorResponse("Cannot send interest to blocked user", 403, {
            correlationId: ctx.correlationId,
          });
        }

        const docId = interestId(userId, toUserId);
        const ref = db.collection(COL_INTERESTS).doc(docId);
        const existing = await ref.get();
        if (!existing.exists) {
          const inverseId = interestId(toUserId, userId);
          const inverseSnap = await db.collection(COL_INTERESTS).doc(inverseId).get();
          if (inverseSnap.exists) {
            const inverse = inverseSnap.data() as FSInterest;
            if (inverse.status === "accepted") {
              await ensureMatchIfMutual(userId, toUserId);
            }
          }

          const [fromUser, toUser] = await Promise.all([
            loadUser(userId),
            loadUser(toUserId),
          ]);
          const interest = buildInterest({
            fromUserId: userId,
            toUserId,
            status: "pending",
            fromSnapshot: snapshotUser(fromUser),
            toSnapshot: snapshotUser(toUser),
          });
          await ref.set(interest, { merge: true });
        }
      } else {
        await db.collection("quickPickSkips").add({ userId, toUserId, createdAt: nowTimestamp() });
      }

      return successResponse({ action, toUserId }, 200, ctx.correlationId);
    } catch (e) {
      console.error("engagement/quick-picks POST error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to record action", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: engagementQuickPickActionSchema,
    rateLimit: { identifier: "quick_picks_action", maxRequests: 60 }
  }
);
