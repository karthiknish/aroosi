import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db, adminStorage } from "@/lib/firebaseAdmin";
import { FieldPath } from "firebase-admin/firestore";
import { buildQuickPick, COL_QUICK_PICKS } from "@/lib/firestoreSchema";
import { engagementQuickPickActionSchema } from "@/lib/validation/apiSchemas/engagement";
import { nowTimestamp } from "@/lib/utils/timestamp";

const DAY_FMT = () => new Date(nowTimestamp()).toISOString().slice(0, 10);

async function ensureQuickPicks(userId: string, dayKey?: string) {
  const day = dayKey || DAY_FMT();
  const col = db.collection(COL_QUICK_PICKS);
  const existingSnap = await col
    .where("userId", "==", userId)
    .where("dayKey", "==", day)
    .orderBy("rank", "asc")
    .get();
  
  if (!existingSnap.empty) {
    return existingSnap.docs.map((d: any) => (d.data() as any).candidateUserId as string);
  }

  let preferredGender: string | null = null;
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data() as any;
      preferredGender = userData?.preferredGender || null;
    }
  } catch {}

  const interactedIds = new Set<string>();
  try {
    const [likedSnap, skippedSnap] = await Promise.all([
      db.collection("interests").where("fromUserId", "==", userId).select("toUserId").get(),
      db.collection("quickPickSkips").where("userId", "==", userId).select("toUserId").get(),
    ]);
    likedSnap.docs.forEach((d: any) => interactedIds.add((d.data() as any).toUserId));
    skippedSnap.docs.forEach((d: any) => interactedIds.add((d.data() as any).toUserId));
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
  usersSnap.docs.forEach((doc: any) => {
    const data = doc.data() as any;
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

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;

  const getAccessibleImageUrl = async (urlOrPath: string): Promise<string> => {
    if (!urlOrPath) return "";
    if (urlOrPath.includes("X-Goog-Signature")) return urlOrPath;
    if (urlOrPath.startsWith("/api/")) return urlOrPath;

    if (urlOrPath.includes("storage.googleapis.com")) {
      const match = urlOrPath.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
      if (match && match[1]) {
        try {
          const file = adminStorage.bucket(bucketName).file(decodeURIComponent(match[1]));
          const [signedUrl] = await file.getSignedUrl({ action: "read", expires: nowTimestamp() + 60 * 60 * 1000 });
          return signedUrl;
        } catch { return urlOrPath; }
      }
    }

    if (urlOrPath.startsWith("users/")) {
      try {
        const file = adminStorage.bucket(bucketName).file(urlOrPath);
        const [signedUrl] = await file.getSignedUrl({ action: "read", expires: nowTimestamp() + 60 * 60 * 1000 });
        return signedUrl;
      } catch { return `https://storage.googleapis.com/${bucketName}/${urlOrPath}`; }
    }

    return urlOrPath;
  };

  const out: any[] = [];
  const chunkSize = 10;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const slice = userIds.slice(i, i + chunkSize);
    const snap = await db.collection("users").where(FieldPath.documentId(), "in", slice).get();

    await Promise.all(
      snap.docs.map(async (d: any) => {
        const data = d.data() as any;
        const profileImageUrls = Array.isArray(data.profileImageUrls) ? data.profileImageUrls : [];
        const signedUrls = await Promise.all(profileImageUrls.slice(0, 3).map((url: string) => getAccessibleImageUrl(url)));

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

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { searchParams } = new URL(ctx.request.url);
    const dayKey = searchParams.get("day") || undefined;

    try {
      // Deny banned users
      const u = await db.collection("users").doc(userId).get();
      if (u.exists && (u.data() as any)?.banned === true) {
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
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { toUserId, action } = body;

    if (toUserId === userId) {
      return errorResponse("Cannot act on self", 400, { correlationId: ctx.correlationId });
    }

    try {
      if (action === "like") {
        const interestsCol = db.collection("interests");
        const existing = await interestsCol.where("fromUserId", "==", userId).where("toUserId", "==", toUserId).limit(1).get();
        if (existing.empty) {
          await interestsCol.add({
            fromUserId: userId,
            toUserId,
            status: "pending",
            createdAt: nowTimestamp(),
            updatedAt: nowTimestamp(),
          });
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
